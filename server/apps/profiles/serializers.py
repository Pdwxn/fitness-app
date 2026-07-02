from rest_framework import serializers

from apps.users.models import UserProfile
from apps.users.serializers import UserProfileSerializer

from .models import UserHealthData


class ProfileSerializer(UserProfileSerializer):
    class Meta(UserProfileSerializer.Meta):
        model = UserProfile

    def validate_age(self, value):
        if value is not None and not 13 <= value <= 100:
            raise serializers.ValidationError("Age must be between 13 and 100.")
        return value

    def validate_weight_kg(self, value):
        if value is not None and not 20 <= value <= 400:
            raise serializers.ValidationError("Weight must be between 20kg and 400kg.")
        return value

    def validate_height_cm(self, value):
        if value is not None and not 80 <= value <= 250:
            raise serializers.ValidationError("Height must be between 80cm and 250cm.")
        return value


class UserHealthDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserHealthData
        fields = (
            "id",
            "activity_level",
            "physical_goals",
            "specific_goal",
            "injuries",
            "equipment_type",
            "available_equipment",
            "routine_type",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_physical_goals(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Physical goals must be a list.")
        return value

    def validate_injuries(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Injuries must be a list.")
        return value

    def validate_available_equipment(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Available equipment must be a list.")
        return value

    def validate(self, attrs):
        equipment_type = attrs.get("equipment_type", getattr(self.instance, "equipment_type", ""))
        available_equipment = attrs.get(
            "available_equipment",
            getattr(self.instance, "available_equipment", []),
        )
        if equipment_type == UserHealthData.EquipmentType.HOME and not available_equipment:
            raise serializers.ValidationError(
                {"available_equipment": "Select available equipment for home workouts."}
            )
        return attrs


class OnboardingCompleteSerializer(serializers.Serializer):
    profile = ProfileSerializer()
    health = UserHealthDataSerializer()

    def validate_profile(self, value):
        required_fields = (
            "full_name", "gender", "age", "weight_kg", "height_cm",
            "experience_level", "training_style", "intensity_preference",
            "days_per_week", "session_duration_minutes",
        )
        missing = [field for field in required_fields if value.get(field) in (None, "")]
        if missing:
            raise serializers.ValidationError({field: "This field is required." for field in missing})

        age = value.get("age")
        if age is not None and not 13 <= age <= 100:
            raise serializers.ValidationError({"age": "Age must be between 13 and 100."})

        weight = value.get("weight_kg")
        if weight is not None and not 20 <= weight <= 400:
            raise serializers.ValidationError({"weight_kg": "Weight must be between 20kg and 400kg."})

        height = value.get("height_cm")
        if height is not None and not 80 <= height <= 250:
            raise serializers.ValidationError({"height_cm": "Height must be between 80cm and 250cm."})

        days = value.get("days_per_week")
        if days is not None and not 1 <= days <= 7:
            raise serializers.ValidationError({"days_per_week": "Days per week must be between 1 and 7."})

        duration = value.get("session_duration_minutes")
        if duration is not None and not 15 <= duration <= 120:
            raise serializers.ValidationError({"session_duration_minutes": "Duration must be between 15 and 120 minutes."})

        return value

    def validate_health(self, value):
        required_fields = ("activity_level", "equipment_type", "routine_type")
        missing = [field for field in required_fields if value.get(field) in (None, "")]
        if missing:
            raise serializers.ValidationError({field: "This field is required." for field in missing})

        physical_goals = value.get("physical_goals")
        if not isinstance(physical_goals, list) or not physical_goals:
            raise serializers.ValidationError({"physical_goals": "Select at least one goal."})

        injuries = value.get("injuries", [])
        if not isinstance(injuries, list):
            raise serializers.ValidationError({"injuries": "Injuries must be a list."})

        available_equipment = value.get("available_equipment", [])
        if not isinstance(available_equipment, list):
            raise serializers.ValidationError({"available_equipment": "Available equipment must be a list."})

        if value.get("equipment_type") == UserHealthData.EquipmentType.HOME and not available_equipment:
            raise serializers.ValidationError(
                {"available_equipment": "Select available equipment for home workouts."}
            )

        return value
