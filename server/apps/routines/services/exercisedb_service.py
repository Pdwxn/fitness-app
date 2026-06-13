import difflib
import json
import logging
import os

from apps.routines.models import RoutineExercise, StoredExercise


logger = logging.getLogger(__name__)

GITHUB_IMAGE_BASE = (
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
)

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


def _build_result(name: str) -> dict | None:
    try:
        ex = StoredExercise.objects.get(name=name)
    except StoredExercise.DoesNotExist:
        return None
    image_url = ""
    if ex.image_paths:
        image_url = GITHUB_IMAGE_BASE + ex.image_paths[0]
    return {
        "name": ex.name,
        "image_url": image_url,
        "instructions": ex.instructions,
    }


def enrich_exercise(exercise: RoutineExercise) -> bool:
    bank_match = lookup_exercise_in_bank(exercise.name)

    if bank_match:
        search_term = bank_match["search_term"].strip()
        logger.info(
            ">>> enrich[%s] name='%s' muscle='%s' | using BANK -> term='%s'",
            exercise.id, exercise.name, exercise.muscle_group, search_term,
        )
    else:
        if exercise.image_url:
            logger.debug(
                ">>> enrich[%s] name='%s' | NOT in bank, has image, SKIP",
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
    instructions = match.get("instructions", "")

    logger.info(
        ">>> enrich[%s] name='%s' | UPDATED image_url='%s'",
        exercise.id, exercise.name, image_url[:80] if image_url else "",
    )

    RoutineExercise.objects.filter(id=exercise.id).update(
        image_url=image_url,
    )

    return bool(image_url)


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
