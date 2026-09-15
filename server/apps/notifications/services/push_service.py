"""Sends Web Push notifications and keeps PushSubscription rows honest.

Notification text is composed here (server-side, keyed off
``UserProfile.preferred_language``) rather than on the client, per the plan --
the client only handles the generic opt-in UI and displaying whatever payload
arrives.
"""
import json
import logging

from django.conf import settings

from apps.notifications.models import PushSubscription

logger = logging.getLogger(__name__)

_COPY = {
    "es": {
        "routine_ready_title": "Tu rutina esta lista",
        "routine_ready_body": "Tu nueva rutina mensual ya esta disponible.",
    },
    "en": {
        "routine_ready_title": "Your routine is ready",
        "routine_ready_body": "Your new monthly routine is now available.",
    },
}


def _copy_for(user, key):
    lang = getattr(user, "preferred_language", "es") or "es"
    return _COPY.get(lang, _COPY["es"])[key]


def is_configured() -> bool:
    return bool(settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY)


def send_push_to_user(user, *, title: str, body: str, url: str = "/") -> int:
    """Best-effort send to every device the user has subscribed on.

    Prunes subscriptions the push service reports as gone (404/410) as it
    goes. Returns how many devices were actually notified. Never raises --
    callers (routine generation, etc.) treat this as a side effect, not
    something that should fail the request if push is misconfigured or a
    device is unreachable.
    """
    if not is_configured():
        logger.info("VAPID keys not configured; skipping push to user %s", user.id)
        return 0

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush is not installed; skipping push to user %s", user.id)
        return 0

    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0
    for subscription in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
            )
            sent += 1
        except WebPushException as exc:
            # exc.status_code handles both requests (status_code) and aiohttp
            # (status) response objects.
            status_code = exc.status_code
            if status_code in (404, 410):
                logger.info(
                    "Push subscription %s is gone (status %s); removing it.",
                    subscription.id,
                    status_code,
                )
                subscription.delete()
            else:
                logger.warning("Push failed for subscription %s: %s", subscription.id, exc)
        except Exception:
            logger.exception("Unexpected error sending push to subscription %s", subscription.id)

    return sent


def notify_routine_ready(user, routine) -> int:
    return send_push_to_user(
        user,
        title=_copy_for(user, "routine_ready_title"),
        body=_copy_for(user, "routine_ready_body"),
        url="/routine",
    )
