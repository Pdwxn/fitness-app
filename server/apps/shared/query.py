from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import ValidationError


def parse_updated_since(value):
    """Parses the ``?updated_since=`` delta-sync cursor into an aware datetime (400 if malformed)."""
    parsed = parse_datetime(value)
    if parsed is None:
        raise ValidationError({"updated_since": "Must be an ISO-8601 datetime."})
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed
