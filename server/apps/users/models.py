import uuid

from django.db import models


class UserProfile(models.Model):
    class Language(models.TextChoices):
        SPANISH = "es", "Spanish"
        ENGLISH = "en", "English"

    class Units(models.TextChoices):
        METRIC = "metric", "Metric"
        IMPERIAL = "imperial", "Imperial"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.SPANISH,
    )
    preferred_units = models.CharField(
        max_length=10,
        choices=Units.choices,
        default=Units.METRIC,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name or str(self.id)
