from rest_framework import serializers


class PushSubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=255)
    auth = serializers.CharField(max_length=255)


class PushSubscriptionInputSerializer(serializers.Serializer):
    """Mirrors the browser's `PushSubscription.toJSON()` shape:
    `{ endpoint, keys: { p256dh, auth }, expirationTime }`.
    """

    endpoint = serializers.URLField(max_length=500)
    keys = PushSubscriptionKeysSerializer()
    expirationTime = serializers.CharField(required=False, allow_null=True)
