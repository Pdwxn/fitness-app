import logging

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework.views import APIView
from .models import UserHealthData
from .serializers import OnboardingCompleteSerializer, ProfileSerializer, UserHealthDataSerializer

logger = logging.getLogger(__name__)


PROFILE_REQUIRED_FIELDS = (
    "full_name", "gender", "age", "weight_kg", "height_cm",
    "experience_level", "training_style", "intensity_preference",
    "days_per_week", "session_duration_minutes",
)
HEALTH_REQUIRED_FIELDS = ("activity_level", "equipment_type", "routine_type")


def is_onboarding_complete(user):
    profile_complete = all(getattr(user, field) not in (None, "") for field in PROFILE_REQUIRED_FIELDS)
    try:
        health_data = user.health_data
    except UserHealthData.DoesNotExist:
        return False

    health_complete = all(getattr(health_data, field) not in (None, "") for field in HEALTH_REQUIRED_FIELDS)
    has_goals = bool(health_data.physical_goals)
    home_equipment_complete = (
        health_data.equipment_type != UserHealthData.EquipmentType.HOME
        or bool(health_data.available_equipment)
    )
    return profile_complete and health_complete and has_goals and home_equipment_complete


class ProfileView(APIView):
    @method_decorator(cache_page(60 * 5))
    @method_decorator(vary_on_headers("Authorization"))
    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileHealthView(APIView):
    def get_health_data(self, user):
        health_data, _ = UserHealthData.objects.get_or_create(user=user)
        return health_data

    @method_decorator(cache_page(60 * 5))
    @method_decorator(vary_on_headers("Authorization"))
    def get(self, request):
        serializer = UserHealthDataSerializer(self.get_health_data(request.user))
        return Response(serializer.data)

    def put(self, request):
        health_data = self.get_health_data(request.user)
        serializer = UserHealthDataSerializer(health_data, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OnboardingStatusView(APIView):
    @method_decorator(cache_page(60 * 5))
    @method_decorator(vary_on_headers("Authorization"))
    def get(self, request):
        return Response({"completed": is_onboarding_complete(request.user)})


ONBOARDING_PROFILE_FIELDS = [
    "experience_level", "training_style", "priority_muscles",
    "intensity_preference", "medical_conditions",
    "days_per_week", "session_duration_minutes",
]


class OnboardingCompleteView(APIView):
    def post(self, request):
        from apps.routines.serializers import RoutineSerializer
        from apps.routines.services.generation_service import generate_monthly_routine_if_needed

        profile_input = dict(request.data.get("profile", {}))
        health_input = request.data.get("health", {})
        for field in ONBOARDING_PROFILE_FIELDS:
            if field in health_input:
                profile_input[field] = health_input[field]

        merged_data = {"profile": profile_input, "health": health_input}
        serializer = OnboardingCompleteSerializer(data=merged_data)
        serializer.is_valid(raise_exception=True)

        profile_serializer = ProfileSerializer(
            request.user,
            data=serializer.validated_data["profile"],
            partial=True,
        )
        profile_serializer.is_valid(raise_exception=True)
        profile_serializer.save()

        health_data, _ = UserHealthData.objects.get_or_create(user=request.user)
        health_serializer = UserHealthDataSerializer(
            health_data,
            data=serializer.validated_data["health"],
            partial=True,
        )
        health_serializer.is_valid(raise_exception=True)
        health_serializer.save()

        completed = is_onboarding_complete(request.user)
        routine = None
        routine_generated = False
        generation_error = None

        if completed:
            try:
                routine, routine_generated = generate_monthly_routine_if_needed(request.user)
            except APIException as exc:
                generation_error = {
                    "detail": exc.detail,
                    "code": exc.get_codes(),
                }
            except Exception as exc:
                generation_error = {
                    "detail": str(exc),
                    "code": "unexpected_error",
                }
                logger.exception(
                    "Routine generation failed unexpectedly for user %s", request.user.id
                )

        return Response(
            {
                "completed": completed,
                "routine_generated": routine_generated,
                "routine": RoutineSerializer(routine).data if routine else None,
                "generation_error": generation_error,
                "profile": profile_serializer.data,
                "health": health_serializer.data,
            }
        )
