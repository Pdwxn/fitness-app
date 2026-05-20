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
