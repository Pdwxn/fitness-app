import uuid

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import UserProfile


SUPPORTED_AUDIENCE = "authenticated"


class SupabaseJWTAuthentication(BaseAuthentication):
    jwks_client = None

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return None

        try:
            payload = self.decode_token(token)
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

    def decode_token(self, token):
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed("Invalid token header") from exc

        algorithm = header.get("alg")
        if algorithm == "ES256":
            return self.decode_es256_token(token)

        if algorithm == "HS256":
            return self.decode_hs256_token(token)

        raise AuthenticationFailed("Unsupported token signing algorithm")

    def decode_es256_token(self, token):
        if not settings.SUPABASE_URL:
            raise AuthenticationFailed("Supabase URL is not configured")

        signing_key = self.get_jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience=SUPPORTED_AUDIENCE,
        )

    def decode_hs256_token(self, token):
        if not settings.SUPABASE_JWT_SECRET:
            raise AuthenticationFailed("Supabase JWT secret is not configured")

        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=SUPPORTED_AUDIENCE,
        )

    def get_jwks_client(self):
        if self.__class__.jwks_client is None:
            supabase_url = settings.SUPABASE_URL.rstrip("/")
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            self.__class__.jwks_client = jwt.PyJWKClient(jwks_url)

        return self.__class__.jwks_client
