import difflib
import json
import logging
import os

from apps.routines.models import RoutineExercise, StoredExercise


logger = logging.getLogger(__name__)

GITHUB_IMAGE_BASE = (
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
)

# Pinned to a commit (not a branch) so the URLs never change under us --
# jsDelivr's GitHub proxy caches by ref, and a branch ref can be force-pushed
# or have its history rewritten upstream. Same dataset/commit openGym itself
# points at (frontend/package.json, VITE_IMG_BASE / VITE_GIF_BASE).
EXERCISES_DATASET_COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"
EXERCISES_DATASET_IMAGE_BASE = (
    f"https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@{EXERCISES_DATASET_COMMIT}/images/"
)
EXERCISES_DATASET_GIF_BASE = (
    f"https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@{EXERCISES_DATASET_COMMIT}/videos/"
)


def resolve_image_url(exercise: "StoredExercise") -> str:
    """Resolve the public image URL for a StoredExercise based on its provider."""
    if not exercise.image_paths:
        return ""
    first = exercise.image_paths[0]
    provider = exercise.image_provider or "free-exercise-db"
    if provider == "exercises-dataset":
        return f"{EXERCISES_DATASET_IMAGE_BASE}{first}"
    return f"{GITHUB_IMAGE_BASE}{first}"


def resolve_gif_url(exercise: "StoredExercise") -> str:
    """Resolve the animated-demo URL for a StoredExercise, if its provider has one.

    Only ``exercises-dataset`` ships gifs today; other providers return "".
    """
    if not exercise.gif_path:
        return ""
    provider = exercise.image_provider or "free-exercise-db"
    if provider == "exercises-dataset":
        return f"{EXERCISES_DATASET_GIF_BASE}{exercise.gif_path}"
    return ""

MUSCLE_MAP = {
    "pectoral": "chest",
    "pecho": "chest",
    "chest": "chest",
    "dorsal": "back",
    "espalda": "back",
    "back": "back",
    "deltoides": "shoulders",
    "hombro": "shoulders",
    "shoulder": "shoulders",
    "shoulders": "shoulders",
    "cuadriceps": "quadriceps",
    "quad": "quadriceps",
    "quads": "quadriceps",
    "femoral": "hamstrings",
    "isquio": "hamstrings",
    "isquiotibiales": "hamstrings",
    "hamstring": "hamstrings",
    "gluteo": "glutes",
    "glute": "glutes",
    "glutes": "glutes",
    "biceps": "biceps",
    "bíceps": "biceps",
    "triceps": "triceps",
    "tríceps": "triceps",
    "abdominales": "abdominals",
    "abdomen": "abdominals",
    "core": "abdominals",
    "abs": "abdominals",
    "gemelos": "calves",
    "pantorrilla": "calves",
    "calf": "calves",
    "calves": "calves",
    "piernas": None,
    "legs": None,
    "pierna": None,
    "leg": None,
}

_EXERCISE_BANK: dict | None = None


def _load_exercise_bank() -> dict:
    global _EXERCISE_BANK
    if _EXERCISE_BANK is not None:
        return _EXERCISE_BANK
    path = os.path.join(os.path.dirname(__file__), "..", "data", "exercise_bank.json")
    with open(path, encoding="utf-8") as f:
        _EXERCISE_BANK = json.load(f)
    return _EXERCISE_BANK


def _normalize_name(name: str) -> str:
    return name.strip().lower()


def _muscle_to_primary(name: str | None) -> str | None:
    if not name:
        return None
    key = name.strip().lower()
    for prefix, mapped in MUSCLE_MAP.items():
        if prefix in key or key in prefix:
            return mapped
    words = key.split()
    for prefix, mapped in MUSCLE_MAP.items():
        if prefix in words:
            return mapped
    return None


def lookup_exercise_in_bank(name_es: str) -> dict | None:
    name_lower = name_es.strip().lower()
    bank = _load_exercise_bank()
    fuzzy: list[tuple[int, dict]] = []

    for group in bank["muscle_groups"]:
        for ex in group.get("exercises", []):
            bank_name = ex["es"].strip().lower()
            if bank_name == name_lower:
                return ex
            if bank_name in name_lower or name_lower in bank_name:
                fuzzy.append((len(bank_name), ex))
        for sg in group.get("subgroups") or []:
            for ex in sg.get("exercises", []):
                bank_name = ex["es"].strip().lower()
                if bank_name == name_lower:
                    return ex
                if bank_name in name_lower or name_lower in bank_name:
                    fuzzy.append((len(bank_name), ex))

    if fuzzy:
        fuzzy.sort(key=lambda x: x[0], reverse=True)
        return fuzzy[0][1]

    return None


def _all_names() -> tuple[list[str], list[str]]:
    names = list(StoredExercise.objects.values_list("name", flat=True))
    names_lower = [n.lower() for n in names]
    return names, names_lower


def _normalize_word(w: str) -> str:
    return w.lower().replace("-", "").replace(",", "").rstrip("s")


def _overlap(term_words: list[str], name_words: list[str]) -> int:
    count = 0
    for tw in term_words:
        tn = _normalize_word(tw)
        for nw in name_words:
            if tn == _normalize_word(nw):
                count += 1
                break
    return count


def _score_match(term_words: list[str], name_words: list[str]) -> float:
    if not term_words or not name_words:
        return 0.0
    overlap = _overlap(term_words, name_words)
    if overlap == 0:
        return 0.0
    recall = overlap / len(term_words)
    precision = overlap / len(name_words)
    if recall + precision == 0:
        return 0.0
    return 2 * (recall * precision) / (recall + precision)


def search_exercise(search_term: str, muscle_group: str | None = None) -> dict | None:
    if not search_term:
        return None

    term = _normalize_name(search_term)
    names, names_lower = _all_names()

    # First: exact match on name
    for i, n in enumerate(names_lower):
        if n == term or n.replace("-", " ") == term:
            return _build_result(names[i])

    term_words = term.split()

    # Second: score all names by word overlap
    scored: list[tuple[float, int, str]] = []
    for i, n in enumerate(names_lower):
        name_words = n.split()
        score = _score_match(term_words, name_words)
        if score > 0:
            scored.append((score, len(name_words), names[i]))

    if scored:
        # Sort by score desc, then by name length asc (prefer fewer extra words)
        scored.sort(key=lambda x: (-x[0], x[1]))
        best_score = scored[0][0]
        if best_score >= 0.5:
            return _build_result(scored[0][2])

    # Third: term substring of name (prefer shorter)
    matches = []
    for i, n in enumerate(names_lower):
        if term in n:
            matches.append((len(n), names[i]))
    if matches:
        matches.sort(key=lambda x: x[0])
        return _build_result(matches[0][1])

    # Fourth: name substring of term
    matches = []
    for i, n in enumerate(names_lower):
        if n in term:
            matches.append((len(n), names[i]))
    if matches:
        matches.sort(key=lambda x: x[0], reverse=True)
        return _build_result(matches[0][1])

    # Fifth: difflib fuzzy
    close = difflib.get_close_matches(term, names_lower, n=1, cutoff=0.6)
    if close:
        idx = names_lower.index(close[0])
        return _build_result(names[idx])

    return None


def _result_from_stored(ex: StoredExercise) -> dict:
    return {
        "name": ex.name,
        "image_url": resolve_image_url(ex),
        "instructions": ex.instructions,
        "external_id": ex.external_id,
        "gif_url": resolve_gif_url(ex),
    }


def _build_result(name: str) -> dict | None:
    try:
        ex = StoredExercise.objects.get(name=name)
    except StoredExercise.DoesNotExist:
        return None
    return _result_from_stored(ex)


def enrich_exercise(exercise: RoutineExercise) -> bool:
    # Fast path: the exercise was picked from the catalog (manual builder) and
    # carries the exact StoredExercise id -> no fuzzy matching needed.
    if exercise.source_external_id:
        stored = StoredExercise.objects.filter(
            external_id=exercise.source_external_id
        ).first()
        if stored is not None:
            image_url = resolve_image_url(stored)
            gif_url = resolve_gif_url(stored)
            updates = {"image_url": image_url}
            if gif_url:
                updates["video_url"] = gif_url
            if not exercise.instructions.strip() and stored.instructions:
                updates["instructions"] = stored.instructions
            RoutineExercise.objects.filter(id=exercise.id).update(**updates)
            logger.info(
                ">>> enrich[%s] name='%s' | direct external_id='%s' -> image_url='%s'",
                exercise.id, exercise.name, exercise.source_external_id,
                image_url[:80] if image_url else "",
            )
            return bool(image_url)

    # Everything below matches by name (bank translation or fuzzy search), so
    # it never had a source_external_id to begin with -- this is the identity
    # the progression engine needs (a stable link to the catalog across
    # months/routines), so we persist it here too, not just on the fast path.
    already_identified = bool(exercise.source_external_id)

    bank_match = lookup_exercise_in_bank(exercise.name)

    if bank_match:
        search_term = bank_match["search_term"].strip()
        logger.info(
            ">>> enrich[%s] name='%s' muscle='%s' | using BANK -> term='%s'",
            exercise.id, exercise.name, exercise.muscle_group, search_term,
        )
    else:
        if exercise.image_url and already_identified:
            logger.debug(
                ">>> enrich[%s] name='%s' | NOT in bank, already enriched, SKIP",
                exercise.id, exercise.name,
            )
            return True
        search_term = exercise.search_term.strip()
        logger.info(
            ">>> enrich[%s] name='%s' muscle='%s' | NOT in bank, using GEMINI -> term='%s'",
            exercise.id, exercise.name, exercise.muscle_group, search_term,
        )

    if not search_term:
        logger.info(">>> enrich[%s] name='%s' | NO search_term, SKIP", exercise.id, exercise.name)
        return False

    match = search_exercise(search_term, exercise.muscle_group)

    if not match and bank_match and exercise.search_term.strip():
        gemini_term = exercise.search_term.strip()
        if gemini_term != search_term:
            logger.info(
                ">>> enrich[%s] | bank term '%s' failed, trying GEMINI term '%s'",
                exercise.id, search_term, gemini_term,
            )
            match = search_exercise(gemini_term, exercise.muscle_group)

    if not match:
        logger.info(">>> enrich[%s] name='%s' | NO match in local DB", exercise.id, exercise.name)
        return False

    image_url = match["image_url"]
    external_id = match.get("external_id", "")
    gif_url = match.get("gif_url", "")

    logger.info(
        ">>> enrich[%s] name='%s' | UPDATED image_url='%s' external_id='%s'",
        exercise.id, exercise.name, image_url[:80] if image_url else "", external_id,
    )

    updates = {}
    if not exercise.image_url:
        updates["image_url"] = image_url
    if external_id and not already_identified:
        updates["source_external_id"] = external_id
    # Name-matched exercises (AI routines) used to end up with no demo at all:
    # only the catalog fast path above filled video_url.
    if gif_url and not exercise.video_url:
        updates["video_url"] = gif_url
    if updates:
        RoutineExercise.objects.filter(id=exercise.id).update(**updates)

    return bool(exercise.image_url or image_url)


def enrich_routine(routine) -> int:
    exercises = RoutineExercise.objects.filter(day__week__routine=routine).order_by(
        "day__week__week_number", "day__day_number", "order"
    )

    enriched_count = 0
    for exercise in exercises:
        if enrich_exercise(exercise):
            enriched_count += 1

    logger.info(
        ">>> ExerciseDB: enriched %d/%d exercises for routine %s",
        enriched_count,
        exercises.count(),
        routine.id,
    )

    return enriched_count
