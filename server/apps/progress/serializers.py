from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.routines.models import RoutineDay

from .models import DailyLog


class ExerciseLogSerializer(serializers.Serializer):
    exercise_id = serializers.UUIDField()
    exercise_name = serializers.CharField(max_length=120)
    completed = serializers.BooleanField(default=False)
    actual_sets = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    actual_reps = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    actual_weight_kg = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    note = serializers.CharField(required=False, allow_blank=True)


class DailyLogSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    routine_day_id = serializers.UUIDField(write_only=True)
    exercises_done = ExerciseLogSerializer(many=True, required=False)

    class Meta:
        model = DailyLog
        fields = (
            "id",
            "routine_day",
            "routine_day_id",
            "date",
            "completed",
            "day_note",
            "exercises_done",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("routine_day", "created_at", "updated_at")

    def validate_routine_day_id(self, value):
        user = self.context["request"].user
        if not RoutineDay.objects.filter(id=value, week__routine__user=user).exists():
            raise serializers.ValidationError("Routine day does not belong to the current user.")
        return value

    def validate_exercises_done(self, value):
        return [normalize_exercise_log(exercise) for exercise in value]

    def create(self, validated_data):
        user = self.context["request"].user
        log_id = validated_data.pop("id", None)
        routine_day_id = validated_data.pop("routine_day_id")
        routine_day = RoutineDay.objects.get(id=routine_day_id, week__routine__user=user)

        with transaction.atomic():
            existing = DailyLog.objects.select_for_update().filter(
                user=user,
                routine_day=routine_day,
                date=validated_data["date"],
            ).first()

            if existing is not None:
                for field, value in validated_data.items():
                    setattr(existing, field, value)
                existing.save()
                return existing

            create_data = {"user": user, "routine_day": routine_day, **validated_data}
            if log_id:
                create_data["id"] = log_id

            return DailyLog.objects.create(**create_data)

    def update(self, instance, validated_data):
        validated_data.pop("routine_day_id", None)
        return super().update(instance, validated_data)


class DailyLogBatchSerializer(serializers.Serializer):
    logs = DailyLogSerializer(many=True)


class ProgressStatsSerializer(serializers.Serializer):
    completed_days = serializers.IntegerField()
    total_exercises_completed = serializers.IntegerField()
    pending_sync = serializers.IntegerField(default=0)


def normalize_exercise_log(exercise):
    actual_weight_kg = exercise.get("actual_weight_kg")
    return {
        "exercise_id": str(exercise["exercise_id"]),
        "exercise_name": exercise["exercise_name"],
        "completed": exercise.get("completed", False),
        "actual_sets": exercise.get("actual_sets"),
        "actual_reps": exercise.get("actual_reps"),
        "actual_weight_kg": str(actual_weight_kg) if actual_weight_kg is not None else None,
        "note": exercise.get("note", ""),
    }
