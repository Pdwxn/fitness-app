import uuid

from django.db import models

from apps.users.models import UserProfile


class PushSubscription(models.Model):
    """One browser/device's Web Push subscription for a user.

    ``endpoint`` is globally unique (it identifies one specific push service
    subscription, independent of which user it's attached to), so
    subscribing again from the same device -- e.g. after clearing storage --
    naturally upserts instead of creating a duplicate row.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user} - {self.endpoint[:60]}"
