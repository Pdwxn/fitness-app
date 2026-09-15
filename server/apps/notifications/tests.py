from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.notifications.models import PushSubscription
from apps.notifications.services import push_service
from apps.users.models import UserProfile


def make_user(**overrides):
    defaults = dict(full_name="Test User", preferred_language="es")
    defaults.update(overrides)
    return UserProfile.objects.create(**defaults)


def subscription_payload(endpoint="https://push.example.com/abc"):
    return {
        "endpoint": endpoint,
        "keys": {"p256dh": "p256dh-value", "auth": "auth-value"},
        "expirationTime": None,
    }


# --------------------------------------------------------------------------- #
# POST /api/v1/push/subscribe/
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestSubscribe:
    def test_creates_a_subscription(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("push-subscribe"), subscription_payload(), format="json")

        assert response.status_code == 201
        sub = PushSubscription.objects.get(endpoint="https://push.example.com/abc")
        assert sub.user_id == user.id
        assert sub.p256dh == "p256dh-value"

    def test_resubscribing_the_same_endpoint_upserts(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        client.post(reverse("push-subscribe"), subscription_payload(), format="json")
        payload = subscription_payload()
        payload["keys"]["auth"] = "new-auth-value"
        client.post(reverse("push-subscribe"), payload, format="json")

        assert PushSubscription.objects.filter(endpoint="https://push.example.com/abc").count() == 1
        assert PushSubscription.objects.get(endpoint="https://push.example.com/abc").auth == "new-auth-value"

    def test_resubscribing_as_a_different_user_reassigns_it(self):
        first = make_user(full_name="First")
        second = make_user(full_name="Second")
        client = APIClient()

        client.force_authenticate(user=first)
        client.post(reverse("push-subscribe"), subscription_payload(), format="json")

        client.force_authenticate(user=second)
        client.post(reverse("push-subscribe"), subscription_payload(), format="json")

        sub = PushSubscription.objects.get(endpoint="https://push.example.com/abc")
        assert sub.user_id == second.id

    def test_missing_keys_is_400(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            reverse("push-subscribe"), {"endpoint": "https://push.example.com/x"}, format="json"
        )
        assert response.status_code == 400


# --------------------------------------------------------------------------- #
# DELETE /api/v1/push/subscribe/
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestUnsubscribe:
    def test_removes_own_subscription(self):
        user = make_user()
        PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/abc", p256dh="a", auth="b"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(
            reverse("push-subscribe"), {"endpoint": "https://push.example.com/abc"}, format="json"
        )

        assert response.status_code == 204
        assert PushSubscription.objects.count() == 0

    def test_missing_endpoint_is_400(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.delete(reverse("push-subscribe"), {}, format="json")
        assert response.status_code == 400

    def test_cannot_remove_another_users_subscription(self):
        owner = make_user(full_name="Owner")
        other = make_user(full_name="Other")
        PushSubscription.objects.create(
            user=owner, endpoint="https://push.example.com/abc", p256dh="a", auth="b"
        )
        client = APIClient()
        client.force_authenticate(user=other)

        response = client.delete(
            reverse("push-subscribe"), {"endpoint": "https://push.example.com/abc"}, format="json"
        )

        assert response.status_code == 204  # no-op, not an error
        assert PushSubscription.objects.count() == 1


# --------------------------------------------------------------------------- #
# push_service
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestPushService:
    def test_skips_silently_when_not_configured(self, settings):
        settings.VAPID_PRIVATE_KEY = ""
        settings.VAPID_PUBLIC_KEY = ""
        user = make_user()
        PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/a", p256dh="a", auth="b"
        )

        with patch("pywebpush.webpush") as mock_webpush:
            sent = push_service.send_push_to_user(user, title="t", body="b")

        assert sent == 0
        mock_webpush.assert_not_called()

    def test_sends_to_every_subscription(self, settings):
        settings.VAPID_PRIVATE_KEY = "priv"
        settings.VAPID_PUBLIC_KEY = "pub"
        user = make_user()
        PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/a", p256dh="a", auth="b"
        )
        PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/b", p256dh="c", auth="d"
        )

        with patch("pywebpush.webpush") as mock_webpush:
            sent = push_service.send_push_to_user(user, title="Hi", body="There", url="/routine")

        assert sent == 2
        assert mock_webpush.call_count == 2

    def test_prunes_subscription_on_410_gone(self, settings):
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "priv"
        settings.VAPID_PUBLIC_KEY = "pub"
        user = make_user()
        sub = PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/a", p256dh="a", auth="b"
        )

        class FakeResponse:
            status_code = 410

        with patch(
            "pywebpush.webpush", side_effect=WebPushException("gone", response=FakeResponse())
        ):
            sent = push_service.send_push_to_user(user, title="t", body="b")

        assert sent == 0
        assert PushSubscription.objects.filter(id=sub.id).count() == 0

    def test_keeps_subscription_on_other_errors(self, settings):
        from pywebpush import WebPushException

        settings.VAPID_PRIVATE_KEY = "priv"
        settings.VAPID_PUBLIC_KEY = "pub"
        user = make_user()
        sub = PushSubscription.objects.create(
            user=user, endpoint="https://push.example.com/a", p256dh="a", auth="b"
        )

        class FakeResponse:
            status_code = 500

        with patch(
            "pywebpush.webpush", side_effect=WebPushException("boom", response=FakeResponse())
        ):
            sent = push_service.send_push_to_user(user, title="t", body="b")

        assert sent == 0
        assert PushSubscription.objects.filter(id=sub.id).count() == 1

    def test_routine_ready_copy_follows_preferred_language(self, settings):
        settings.VAPID_PRIVATE_KEY = "priv"
        settings.VAPID_PUBLIC_KEY = "pub"
        en_user = make_user(full_name="EN", preferred_language="en")
        PushSubscription.objects.create(
            user=en_user, endpoint="https://push.example.com/en", p256dh="a", auth="b"
        )

        with patch("pywebpush.webpush") as mock_webpush:
            push_service.notify_routine_ready(en_user, routine=None)

        sent_data = mock_webpush.call_args.kwargs["data"]
        assert "ready" in sent_data  # English copy, not Spanish
