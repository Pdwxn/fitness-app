import uuid

from django.db import models

from apps.routines.models import RoutineDay
from apps.users.models import UserProfile


class DailyLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="daily_logs",
    )
    routine_day = models.ForeignKey(
        RoutineDay,
        on_delete=models.CASCADE,
        related_name="daily_logs",
    )
    date = models.DateField()
    completed = models.BooleanField(default=False)
    day_note = models.TextField(blank=True)
    exercises_done = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "-created_at")
        constraints = (
            models.UniqueConstraint(
                fields=("user", "routine_day", "date"),
                name="unique_daily_log_per_user_day_date",
            ),
        )

    def __str__(self):
        return f"{self.user} - {self.routine_day} - {self.date}"
