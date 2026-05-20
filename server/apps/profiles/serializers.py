from rest_framework import serializers

from apps.users.models import UserProfile
from apps.users.serializers import UserProfileSerializer

from .models import UserHealthData


class ProfileSerializer(UserProfileSerializer):
    class Meta(UserProfileSerializer.Meta):
        model = UserProfile


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


class OnboardingCompleteSerializer(serializers.Serializer):
    profile = ProfileSerializer()
    health = UserHealthDataSerializer()

    def validate_profile(self, value):
        required_fields = ("full_name", "gender", "age", "weight_kg", "height_cm")
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
