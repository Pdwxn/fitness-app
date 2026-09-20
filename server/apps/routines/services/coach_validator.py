"""Strict validation of the AI coach's proposed routine edits.

Same premise as openGym's coach validator: **never trust raw model output**.
The model may only propose changes from a closed list; every accepted change
is rebuilt field by field from whitelisted, range-checked values (unknown keys
are dropped, never copied through), exercises must resolve to a real catalog
entry, every change needs a non-empty ``why``, and the whole set has to stay
coherent and within hard limits. Anything else raises
:class:`CoachValidationError`, whose message is fed back to the model for one
repair round (see ``coach_service``).

A routine spans up to 4 weeks, so the unit the model reasons about is a *slot*:
"exercise X on day N", covering every week it appears in. Changes address a
slot (via any of its row ids) and are applied to all its rows.
"""
import re
from dataclasses import dataclass, field

# Hard limits -- deliberately in one place so they are easy to raise.
MAX_CHANGES = 6
MAX_TOUCHED_FRACTION = 0.4
MAX_WEIGHT_CHANGE_PERCENT = 20
MAX_SETS_DELTA = 2
MAX_SETS = 10
MAX_REST_SECONDS = 600
MAX_WHY_LENGTH = 300
MAX_SUMMARY_LENGTH = 500

CHANGE_TYPES = ("adjust_load", "substitute_exercise", "add_exercise", "remove_exercise")

_REPS_RE = re.compile(r"^\d{1,3}(\s*-\s*\d{1,3})?$")


class CoachValidationError(ValueError):
    """A proposed change (or the whole proposal) is invalid; message goes back to the model."""


@dataclass
class Slot:
    day_number: int
    name: str
    ref: str  # id of the earliest-week row, what the model is shown
    row_ids: set = field(default_factory=set)
    external_id: str = ""


@dataclass
class RoutineSnapshot:
    """The parts of a routine the validator needs, decoupled from the ORM."""

    slots_by_row_id: dict  # any row id (str) -> Slot
    slots: list  # unique Slot objects
    training_days: dict  # day_number -> day_name


def normalize_name(name):
    return " ".join(str(name).strip().lower().split())


def slot_key(slot):
    return (slot.day_number, normalize_name(slot.name))


def _clean_text(value, field_name, max_length, *, required=True):
    text = "" if value is None else " ".join(str(value).split())
    if required and not text:
        raise CoachValidationError(f"{field_name} is required.")
    return text[:max_length]


def _int_in_range(value, field_name, low, high):
    if isinstance(value, bool):
        raise CoachValidationError(f"{field_name} must be an integer.")
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise CoachValidationError(f"{field_name} must be an integer.") from exc
    if number < low or number > high:
        raise CoachValidationError(f"{field_name} must be between {low} and {high}.")
    return number


def _number_in_range(value, field_name, low, high):
    if isinstance(value, bool):
        raise CoachValidationError(f"{field_name} must be a number.")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise CoachValidationError(f"{field_name} must be a number.") from exc
    if number < low or number > high:
        raise CoachValidationError(f"{field_name} must be between {low} and {high}.")
    return number


def _reps(value, field_name):
    text = _clean_text(value, field_name, 40)
    if not _REPS_RE.match(text):
        raise CoachValidationError(f"{field_name} must look like '10' or '8-12'.")
    return text.replace(" ", "")


def _slot_from_ref(change, snapshot, index):
    ref = str(change.get("exercise_id", "")).strip()
    slot = snapshot.slots_by_row_id.get(ref)
    if slot is None:
        raise CoachValidationError(
            f"Change {index}: exercise_id '{ref}' does not match any exercise of the routine."
        )
    return slot


def _resolve_new_exercise(raw, snapshot, day_number, resolver, index, own_slot=None):
    if not isinstance(raw, dict):
        raise CoachValidationError(f"Change {index}: the new exercise must be an object.")
    name = _clean_text(raw.get("name"), f"Change {index}: exercise name", 120)
    search_term = _clean_text(raw.get("search_term") or name, f"Change {index}: search_term", 120)
    muscle_group = _clean_text(raw.get("muscle_group"), "muscle_group", 80, required=False)

    resolved = resolver(name, search_term, muscle_group)
    if not resolved or not resolved.get("external_id"):
        raise CoachValidationError(
            f"Change {index}: '{name}' could not be matched to the exercise catalog; "
            "use a common exercise with an accurate English search_term."
        )

    external_id = resolved["external_id"]
    for other in snapshot.slots:
        if other.day_number != day_number or other is own_slot:
            continue
        if other.external_id == external_id or normalize_name(other.name) == normalize_name(name):
            raise CoachValidationError(
                f"Change {index}: '{name}' is already part of day {day_number}."
            )
    return {
        "name": name,
        "muscle_group": muscle_group or resolved.get("muscle_group", ""),
        "external_id": external_id,
        "search_term": search_term,
    }


def validate_coach_response(payload, snapshot, resolver):
    """Returns ``(summary, changes)``; ``changes`` is the normalized, safe list.

    ``resolver(name, search_term, muscle_group)`` -> ``{"external_id", "muscle_group"}``
    or ``None`` (injected so the validator stays free of the ORM / catalog).
    """
    if not isinstance(payload, dict):
        raise CoachValidationError("The response must be a JSON object.")
    raw_changes = payload.get("changes")
    if not isinstance(raw_changes, list):
        raise CoachValidationError("'changes' must be a list.")
    if len(raw_changes) > MAX_CHANGES:
        raise CoachValidationError(
            f"Too many changes ({len(raw_changes)}); propose at most {MAX_CHANGES}."
        )

    summary = _clean_text(payload.get("summary"), "summary", MAX_SUMMARY_LENGTH, required=False)

    changes = []
    targeted_slots = {}  # slot_key -> change type
    added = []  # (day_number, external_id)
    removed_per_day = {}
    added_per_day = {}

    for index, raw in enumerate(raw_changes, start=1):
        if not isinstance(raw, dict):
            raise CoachValidationError(f"Change {index} must be an object.")
        change_type = raw.get("type")
        if change_type not in CHANGE_TYPES:
            raise CoachValidationError(
                f"Change {index}: type must be one of {', '.join(CHANGE_TYPES)}."
            )
        why = _clean_text(raw.get("why"), f"Change {index}: why", MAX_WHY_LENGTH)

        if change_type == "add_exercise":
            day_number = _int_in_range(raw.get("day_number"), f"Change {index}: day_number", 1, 7)
            if day_number not in snapshot.training_days:
                raise CoachValidationError(
                    f"Change {index}: day {day_number} is not a training day of this routine."
                )
            exercise = raw.get("exercise")
            new = _resolve_new_exercise(exercise, snapshot, day_number, resolver, index)
            if (day_number, new["external_id"]) in added:
                raise CoachValidationError(f"Change {index}: exercise added twice to day {day_number}.")
            added.append((day_number, new["external_id"]))
            added_per_day[day_number] = added_per_day.get(day_number, 0) + 1
            new.update(
                {
                    "sets": _int_in_range(exercise.get("sets"), f"Change {index}: sets", 1, MAX_SETS),
                    "reps": _reps(exercise.get("reps"), f"Change {index}: reps"),
                    "weight_kg": (
                        None
                        if exercise.get("weight_kg") in (None, "")
                        else _number_in_range(
                            exercise.get("weight_kg"), f"Change {index}: weight_kg", 0, 1000
                        )
                    ),
                    "rest_seconds": (
                        None
                        if exercise.get("rest_seconds") in (None, "")
                        else _int_in_range(
                            exercise.get("rest_seconds"),
                            f"Change {index}: rest_seconds",
                            0,
                            MAX_REST_SECONDS,
                        )
                    ),
                }
            )
            changes.append(
                {"type": change_type, "day_number": day_number, "exercise": new, "why": why}
            )
            continue

        slot = _slot_from_ref(raw, snapshot, index)
        key = slot_key(slot)
        if key in targeted_slots:
            raise CoachValidationError(
                f"Change {index}: '{slot.name}' on day {slot.day_number} is already "
                f"targeted by another change ({targeted_slots[key]})."
            )
        targeted_slots[key] = change_type

        base = {
            "type": change_type,
            "day_number": slot.day_number,
            "exercise_name": slot.name,
            "exercise_id": slot.ref,
            "why": why,
        }

        if change_type == "remove_exercise":
            removed_per_day[slot.day_number] = removed_per_day.get(slot.day_number, 0) + 1
            changes.append(base)

        elif change_type == "substitute_exercise":
            new = _resolve_new_exercise(
                raw.get("new_exercise"), snapshot, slot.day_number, resolver, index, own_slot=slot
            )
            if new["external_id"] == slot.external_id or normalize_name(new["name"]) == normalize_name(slot.name):
                raise CoachValidationError(
                    f"Change {index}: the substitute is the same exercise as '{slot.name}'."
                )
            base["new_exercise"] = new
            changes.append(base)

        else:  # adjust_load
            adjust = {}
            if raw.get("weight_change_percent") not in (None, ""):
                percent = _number_in_range(
                    raw.get("weight_change_percent"),
                    f"Change {index}: weight_change_percent",
                    -MAX_WEIGHT_CHANGE_PERCENT,
                    MAX_WEIGHT_CHANGE_PERCENT,
                )
                if percent != 0:
                    adjust["weight_change_percent"] = round(percent, 1)
            if raw.get("sets_delta") not in (None, ""):
                delta = _int_in_range(
                    raw.get("sets_delta"), f"Change {index}: sets_delta", -MAX_SETS_DELTA, MAX_SETS_DELTA
                )
                if delta != 0:
                    adjust["sets_delta"] = delta
            if raw.get("reps") not in (None, ""):
                adjust["reps"] = _reps(raw.get("reps"), f"Change {index}: reps")
            if raw.get("rest_seconds") not in (None, ""):
                adjust["rest_seconds"] = _int_in_range(
                    raw.get("rest_seconds"), f"Change {index}: rest_seconds", 0, MAX_REST_SECONDS
                )
            if not adjust:
                raise CoachValidationError(
                    f"Change {index}: adjust_load must actually change something "
                    "(weight_change_percent, sets_delta, reps or rest_seconds)."
                )
            base.update(adjust)
            changes.append(base)

    touched = len(targeted_slots) + len(added)
    total_slots = max(len(snapshot.slots), 1)
    max_touched = max(1, int(total_slots * MAX_TOUCHED_FRACTION))
    if touched > max_touched:
        raise CoachValidationError(
            f"Too much of the routine is touched ({touched} of {total_slots} exercises); "
            f"at most {max_touched} are allowed."
        )

    for day_number in snapshot.training_days:
        existing = sum(1 for slot in snapshot.slots if slot.day_number == day_number)
        remaining = existing - removed_per_day.get(day_number, 0) + added_per_day.get(day_number, 0)
        if remaining < 1:
            raise CoachValidationError(
                f"Day {day_number} would be left without exercises; keep at least one."
            )

    return summary, changes
