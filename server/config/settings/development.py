import os

os.environ.setdefault("SECRET_KEY", "django-insecure-local-development-key")

from .base import *  # noqa: F403


DEBUG = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
        },
    },
    "loggers": {
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}


# Hot reloads and manual testing hit the API far more than real use; don't let
# the per-user limit lock a developer out for the rest of the hour.
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],  # noqa: F405
        "user": "100000/hour",
    },
}
