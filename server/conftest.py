import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """LocMemCache is process-global and not rolled back between tests
    (unlike the DB). Clear it so cached responses (e.g. the exercise catalog,
    served via ``cache_page``) never leak across tests."""
    cache.clear()
    yield
    cache.clear()
