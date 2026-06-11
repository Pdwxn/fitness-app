import logging
import time

import requests
from django.conf import settings

from apps.routines.models import RoutineExercise


logger = logging.getLogger(__name__)


def get_api_headers():
    return {
        "x-rapidapi-key": settings.EXERCISEDB_API_KEY,
        "x-rapidapi-host": settings.EXERCISEDB_API_HOST,
        "Content-Type": "application/json",
    }


def search_exercise(search_term: str) -> dict | None:
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
        return find_best_match(results, search_term)

    except requests.RequestException as exc:
        logger.warning("ExerciseDB API error for '%s': %s", search_term, exc)
        return None


def find_best_match(results: list[dict], search_term: str) -> dict | None:
    term_lower = search_term.strip().lower()
    term_words = set(term_lower.split())

    scored = []
    for item in results:
        name = (item.get("name") or "").lower()
        name_words = set(name.split())
        common = len(term_words & name_words)
        exact = 1 if term_lower == name or term_lower in name or name in term_lower else 0
        scored.append((common + exact, item))

    if not scored:
        return results[0] if results else None

    scored.sort(key=lambda pair: pair[0], reverse=True)
    best = scored[0][1]

    return {
        "exercise_id": best.get("exerciseId"),
        "name": best.get("name"),
        "image_url": best.get("imageUrl"),
        "image_urls": best.get("imageUrls", {}),
        "video_url": best.get("videoUrl"),
    }


def enrich_exercise(exercise: RoutineExercise) -> bool:
    search_term = exercise.search_term.strip()
    if not search_term:
        return False

    if exercise.image_url and exercise.video_url:
        return True

    match = search_exercise(search_term)
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
