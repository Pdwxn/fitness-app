"""Upserts StoredExercise rows from the free-exercise-db JSON dump.

Split out of the ``import_exercisedb`` management command so the diffing logic
is unit-testable without touching the filesystem.

Design goal: keep ``updated_at`` meaningful. The previous importer soft-deleted
every row and re-inserted with ``ignore_conflicts=True`` on every run, which (a)
bumped ``updated_at`` on *everything* even when nothing changed, and (b) left
re-imported rows stuck soft-deleted (the unique ``external_id`` on the old row
made the "new" insert a no-op conflict that got silently ignored). Neither is
compatible with ``GET /api/v1/exercises/?updated_since=`` doing a real delta.

Here, only exercises whose tracked fields actually changed get a bumped
``updated_at``. Exercises missing from a re-import are soft-deleted; ones that
reappear (their external_id shows up again) are restored.

Known limitation: a soft-deleted (removed) exercise is excluded from
``GET /api/v1/exercises/?updated_since=`` (it filters on the active manager),
so a delta sync never tells an already-synced client an exercise was removed
-- only a full re-sync (no ``updated_since``) will drop it from the client's
local cache. Acceptable for now since removals from the upstream dataset are
rare; a real tombstone mechanism would be needed to fix this properly.
"""
from django.utils import timezone

from apps.routines.models import StoredExercise

TRACKED_FIELDS = (
    "name",
    "force",
    "level",
    "mechanic",
    "equipment",
    "primary_muscles",
    "secondary_muscles",
    "instructions",
    "category",
    "image_paths",
)


def fields_from_source(entry: dict) -> dict:
    """Maps one free-exercise-db JSON entry to StoredExercise field values."""
    return {
        "name": entry["name"],
        "force": entry.get("force") or "",
        "level": entry.get("level") or "",
        "mechanic": entry.get("mechanic") or "",
        "equipment": entry.get("equipment") or "",
        "primary_muscles": entry.get("primaryMuscles", []) or [],
        "secondary_muscles": entry.get("secondaryMuscles", []) or [],
        "instructions": "\n".join(entry.get("instructions", []) or []),
        "category": entry.get("category") or "",
        "image_paths": entry.get("images", []) or [],
    }


def sync_exercises(source_entries: list[dict]) -> dict[str, int]:
    """Upserts StoredExercise from parsed free-exercise-db entries.

    Each entry must have an ``"id"`` key (mapped to ``external_id``). Returns
    counts: ``created``, ``updated``, ``restored`` (subset of updated that were
    previously soft-deleted), ``unchanged``, ``removed`` (soft-deleted because
    absent from ``source_entries``), and ``active_total``.
    """
    incoming = {entry["id"]: fields_from_source(entry) for entry in source_entries}

    existing_by_id = {
        obj.external_id: obj
        for obj in StoredExercise.all_objects.filter(external_id__in=incoming.keys())
    }

    now = timezone.now()
    to_create: list[StoredExercise] = []
    to_update: list[StoredExercise] = []
    restored = unchanged = 0

    for external_id, fields in incoming.items():
        existing = existing_by_id.get(external_id)
        if existing is None:
            to_create.append(StoredExercise(external_id=external_id, **fields))
            continue

        changed = any(getattr(existing, name) != value for name, value in fields.items())
        was_deleted = existing.deleted_at is not None
        if not changed and not was_deleted:
            unchanged += 1
            continue

        for name, value in fields.items():
            setattr(existing, name, value)
        existing.deleted_at = None
        existing.updated_at = now
        to_update.append(existing)
        if was_deleted:
            restored += 1

    removed_ids = list(
        StoredExercise.objects.exclude(external_id__in=incoming.keys()).values_list(
            "external_id", flat=True
        )
    )

    if to_create:
        StoredExercise.objects.bulk_create(to_create, ignore_conflicts=True)
    if to_update:
        # all_objects (not the ActiveManager) so restoring a soft-deleted row's
        # UPDATE actually matches it.
        StoredExercise.all_objects.bulk_update(
            to_update, [*TRACKED_FIELDS, "deleted_at", "updated_at"]
        )
    removed_count = 0
    if removed_ids:
        removed_count = StoredExercise.objects.filter(external_id__in=removed_ids).update(
            deleted_at=now, updated_at=now
        )

    return {
        "created": len(to_create),
        "updated": len(to_update),
        "restored": restored,
        "unchanged": unchanged,
        "removed": removed_count,
        "active_total": StoredExercise.objects.count(),
    }
