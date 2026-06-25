from rest_framework import serializers

from apps.progress.models import DailyLog

from .models import Routine, RoutineDay, RoutineExercise, RoutineWeek


class RoutineExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineExercise
        fields = (
            "id",
            "name",
            "muscle_group",
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
            "month",
            "year",
            "is_active",
            "generated_at",
            "gemini_prompt_hash",
            "weeks",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
