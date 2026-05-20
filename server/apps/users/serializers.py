from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "id",
            "full_name",
            "gender",
            "age",
            "weight_kg",
            "height_cm",
            "preferred_language",
            "preferred_units",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
