from rest_framework import serializers

from apps.progress.models import DailyLog

from .models import (
    Routine,
    RoutineDay,
    RoutineEditProposal,
    RoutineExercise,
    RoutineWeek,
    StoredExercise,
)
from .services.exercisedb_service import resolve_gif_url, resolve_image_url


class RoutineExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineExercise
        fields = (
            "id",
            "name",
            "muscle_group",
            "source_external_id",
            "sets",
            "reps",
            "weight_kg",
            "rest_seconds",
            "image_url",
            "video_url",
            "variants",
            "instructions",
            "search_term",
            "order",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class RoutineDaySerializer(serializers.ModelSerializer):
    exercises = RoutineExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = RoutineDay
        fields = (
            "id",
            "day_number",
            "day_name",
            "is_rest_day",
            "exercises",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class RoutineWeekSerializer(serializers.ModelSerializer):
    days = RoutineDaySerializer(many=True, read_only=True)

    class Meta:
        model = RoutineWeek
        fields = (
            "id",
            "week_number",
            "focus",
            "notes",
            "days",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class RoutineSummarySerializer(serializers.ModelSerializer):
    total_days = serializers.SerializerMethodField()
    completed_days = serializers.SerializerMethodField()

    class Meta:
        model = Routine
        fields = [
            "id",
            "source",
            "month",
            "year",
            "is_active",
            "total_days",
            "completed_days",
            "generated_at",
        ]

    def get_total_days(self, obj):
        return sum(1 for week in obj.weeks.all() for day in week.days.all() if not day.is_rest_day)

    def get_completed_days(self, obj):
        return DailyLog.objects.filter(routine_day__week__routine=obj, completed=True).count()


class RoutineSerializer(serializers.ModelSerializer):
    weeks = RoutineWeekSerializer(many=True, read_only=True)

    class Meta:
        model = Routine
        fields = (
            "id",
            "source",
            "month",
            "year",
            "is_active",
            "generated_at",
            "cycle_started_on",
            "gemini_prompt_hash",
            "weeks",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class StoredExerciseSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    gif_url = serializers.SerializerMethodField()

    class Meta:
        model = StoredExercise
        fields = (
            "external_id",
            "name",
            "force",
            "level",
            "mechanic",
            "equipment",
            "primary_muscles",
            "secondary_muscles",
            "category",
            "instructions",
            "image_url",
            "gif_url",
            "updated_at",
        )
        read_only_fields = fields

    def get_image_url(self, obj):
        return resolve_image_url(obj)

    def get_gif_url(self, obj):
        return resolve_gif_url(obj)


class ManualRoutineInputSerializer(serializers.Serializer):
    """Accepts a user-built routine (weeks -> days -> exercises).

    Delegates the heavy lifting to ``routine_validation.validate_manual_routine_payload``
    so the normalized shape matches what ``persist_routine`` expects.
    """

    weeks = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate(self, attrs):
        from .services.routine_validation import validate_manual_routine_payload

        return validate_manual_routine_payload(self.initial_data)


class RoutineEditProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineEditProposal
        fields = (
            "id",
            "routine",
            "status",
            "target_month",
            "target_year",
            "summary",
            "changes",
            "created_at",
            "decided_at",
        )
        read_only_fields = fields
