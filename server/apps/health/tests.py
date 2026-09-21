from django.test import TestCase

# Create your tests here.


def test_health_check_is_not_throttled(client, settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], "anon": "1/hour"},
    }
    from django.core.cache import cache

    cache.clear()
    assert [client.get("/api/v1/health/").status_code for _ in range(3)] == [200, 200, 200]
