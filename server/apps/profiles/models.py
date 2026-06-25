import uuid

from django.db import models

from apps.shared.managers import ActiveManager
from apps.users.models import UserProfile


class UserHealthData(models.Model):
    class ActivityLevel(models.TextChoices):
        SEDENTARY = "sedentary", "Sedentary"
        LIGHT = "light", "Light"
        MODERATE = "moderate", "Moderate"
        ACTIVE = "active", "Active"
        VERY_ACTIVE = "very_active", "Very active"

    class EquipmentType(models.TextChoices):
        GYM = "gym", "Gym"
        HOME = "home", "Home"
        CALISTHENICS = "calisthenics", "Calisthenics"

    class RoutineType(models.TextChoices):
        PUSH_PULL_LEGS = "push_pull_legs", "Push/Pull/Legs"
        UPPER_LOWER = "upper_lower", "Upper/Lower"
        HYBRID = "hybrid", "Hybrid"
        FIVE_DAYS = "5_days", "5 days"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="health_data",
    )
    activity_level = models.CharField(
        max_length=20,
        choices=ActivityLevel.choices,
        blank=True,
    )
    physical_goals = models.JSONField(default=list, blank=True)
    specific_goal = models.TextField(blank=True)
    injuries = models.JSONField(default=list, blank=True)
    equipment_type = models.CharField(
        max_length=20,
        choices=EquipmentType.choices,
        blank=True,
    )
    available_equipment = models.JSONField(default=list, blank=True)
    routine_type = models.CharField(
        max_length=20,
        choices=RoutineType.choices,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Health data for {self.user}"
