import uuid

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import UserProfile


class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return None

        if not settings.SUPABASE_JWT_SECRET:
            raise AuthenticationFailed("Supabase JWT secret is not configured")

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationFailed("Token expired") from exc
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed("Invalid token") from exc

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationFailed("Token does not include a subject")

        try:
            profile_id = uuid.UUID(user_id)
        except ValueError as exc:
            raise AuthenticationFailed("Token subject is not a valid UUID") from exc

        user, _ = UserProfile.objects.get_or_create(id=profile_id)
        return (user, token)
