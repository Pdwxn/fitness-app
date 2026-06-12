import json
import logging
import os
import time

import requests
from django.conf import settings

from apps.routines.models import RoutineExercise


logger = logging.getLogger(__name__)

MUSCLE_GROUP_MAP: dict[str, list[str]] = {
    "pectoral": ["CHEST"],
    "pecho": ["CHEST"],
    "chest": ["CHEST"],
    "dorsal": ["BACK"],
    "espalda": ["BACK"],
    "back": ["BACK"],
    "deltoides": ["SHOULDERS"],
    "hombro": ["SHOULDERS"],
    "shoulder": ["SHOULDERS"],
    "shoulders": ["SHOULDERS"],
    "cuadriceps": ["UPPER LEGS"],
    "quad": ["UPPER LEGS"],
    "quads": ["UPPER LEGS"],
    "femoral": ["UPPER LEGS"],
    "isquio": ["UPPER LEGS"],
    "isquiotibiales": ["UPPER LEGS"],
    "hamstring": ["UPPER LEGS"],
    "gluteo": ["GLUTES"],
    "glute": ["GLUTES"],
    "glutes": ["GLUTES"],
    "biceps": ["ARMS"],
    "bíceps": ["ARMS"],
    "triceps": ["ARMS"],
    "tríceps": ["ARMS"],
    "abdominales": ["CORE"],
    "abdomen": ["CORE"],
    "core": ["CORE"],
    "abs": ["CORE"],
    "gemelos": ["LOWER LEGS"],
    "pantorrilla": ["LOWER LEGS"],
    "calf": ["LOWER LEGS"],
    "calves": ["LOWER LEGS"],
    "piernas": ["UPPER LEGS", "LOWER LEGS"],
    "legs": ["UPPER LEGS", "LOWER LEGS"],
    "pierna": ["UPPER LEGS", "LOWER LEGS"],
    "leg": ["UPPER LEGS", "LOWER LEGS"],
    "cadena posterior": ["GLUTES", "BACK", "UPPER LEGS"],
    "posterior chain": ["GLUTES", "BACK", "UPPER LEGS"],
    "full body": ["FULL BODY"],
    "cuerpo completo": ["FULL BODY"],
    "cardio": ["CARDIO"],
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


def lookup_exercise_in_bank(name_es: str) -> dict | None:
    name_lower = name_es.strip().lower()
    bank = _load_exercise_bank()
    for group in bank["muscle_groups"]:
        for ex in group.get("exercises", []):
            if ex["es"].strip().lower() == name_lower:
                return ex
        for sg in group.get("subgroups") or []:
            for ex in sg.get("exercises", []):
                if ex["es"].strip().lower() == name_lower:
                    return ex
    return None


def get_api_headers():
    return {
        "x-rapidapi-key": settings.EXERCISEDB_API_KEY,
        "x-rapidapi-host": settings.EXERCISEDB_API_HOST,
        "Content-Type": "application/json",
    }


def _get_item_body_parts(item: dict) -> list[str]:
    parts = []
    raw = item.get("bodyParts") or item.get("bodyPart") or []
    if isinstance(raw, list):
        parts = raw
    elif isinstance(raw, str):
        parts = [raw]
    return [p.lower() for p in parts]


def get_expected_body_parts(muscle_group: str | None) -> list[str]:
    if not muscle_group:
        return []

    # Check bank first (authoritative mapping)
    bank = _load_exercise_bank()
    mg_lower = muscle_group.strip().lower()
    for group in bank["muscle_groups"]:
        if group["name"].lower() == mg_lower:
            return group["body_parts"]

    # Fall back to MUSCLE_GROUP_MAP
    key = muscle_group.strip().lower()
    for prefix, parts in MUSCLE_GROUP_MAP.items():
        if prefix in key or key in prefix:
            return parts

    words = key.split()
    for prefix, parts in MUSCLE_GROUP_MAP.items():
        if prefix in words or prefix == key:
            return parts

    return []


def search_exercise(search_term: str, muscle_group: str | None = None) -> dict | None:
    if not search_term:
        return None

    url = f"https://{settings.EXERCISEDB_API_HOST}/api/v1/exercises/search"
    params = {"search": search_term.strip()}
    headers = get_api_headers()

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        body = response.json()

        if not body.get("success") or not body.get("data"):
            logger.info("ExerciseDB: no results for '%s'", search_term)
            return None

        results = body["data"]
        return find_best_match(results, search_term, muscle_group=muscle_group)

    except requests.RequestException as exc:
        logger.warning("ExerciseDB API error for '%s': %s", search_term, exc)
        return None


def find_best_match(
    results: list[dict],
    search_term: str,
    muscle_group: str | None = None,
) -> dict | None:
    term_lower = search_term.strip().lower()
    term_words = set(term_lower.split())
    expected_parts = get_expected_body_parts(muscle_group)

    def matches_body_part(item: dict) -> bool:
        if not expected_parts:
            return True
        parts = _get_item_body_parts(item)
        return any(ep.lower() in parts for ep in expected_parts)

    scored = []
    for item in results:
        name = (item.get("name") or "").lower()
        name_words = set(name.split())
        common = len(term_words & name_words)
        exact = 1 if term_lower == name or term_lower in name or name in term_lower else 0
        body_match = matches_body_part(item)
        scored.append((common + exact, body_match, item))

    if not scored:
        return results[0] if results else None

    scored.sort(key=lambda pair: (pair[1], pair[0]), reverse=True)
    best_score, best_body, best_item = scored[0]

    # Reject if no word overlap and body doesn't match (wrong exercise)
    if best_score < 1 and not best_body:
        logger.info(
            "ExerciseDB: rejecting result for '%s' — score=%d, body_match=%s",
            search_term, best_score, best_body,
        )
        return None

    return {
        "exercise_id": best_item.get("exerciseId"),
        "name": best_item.get("name"),
        "image_url": best_item.get("imageUrl"),
        "image_urls": best_item.get("imageUrls", {}),
        "video_url": best_item.get("videoUrl"),
        "body_parts": _get_item_body_parts(best_item),
    }


def enrich_exercise(exercise: RoutineExercise) -> bool:
    if exercise.image_url and exercise.video_url:
        return True

    bank_match = lookup_exercise_in_bank(exercise.name)
    search_term = (bank_match["search_term"] if bank_match else exercise.search_term).strip()

    if not search_term:
        return False

    match = search_exercise(search_term, muscle_group=exercise.muscle_group)

    # Fallback: if bank term failed and Gemini provided a different term, try it
    if not match and bank_match and exercise.search_term.strip():
        gemini_term = exercise.search_term.strip()
        if gemini_term != search_term:
            logger.info(
                "Bank search_term '%s' failed for '%s', trying Gemini term '%s'",
                search_term, exercise.name, gemini_term,
            )
            match = search_exercise(gemini_term, muscle_group=exercise.muscle_group)

    if not match:
        return False

    image_url = (match.get("image_urls") or {}).get("480p") or match.get("image_url") or ""
    video_url = match.get("video_url") or ""

    RoutineExercise.objects.filter(id=exercise.id).update(
        image_url=image_url,
        video_url=video_url,
    )

    return bool(image_url or video_url)


def enrich_routine(routine) -> int:
    exercises = RoutineExercise.objects.filter(day__week__routine=routine).order_by(
        "day__week__week_number", "day__day_number", "order"
    )

    enriched_count = 0
    for exercise in exercises:
        if enrich_exercise(exercise):
            enriched_count += 1
        time.sleep(0.15)

    logger.info(
        "ExerciseDB: enriched %d/%d exercises for routine %s",
        enriched_count,
        exercises.count(),
        routine.id,
    )

    return enriched_count
