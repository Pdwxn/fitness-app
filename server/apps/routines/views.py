import logging

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import Routine
from .serializers import RoutineDaySerializer, RoutineSerializer, RoutineSummarySerializer, RoutineWeekSerializer
from .services.dev_seed import seed_dev_routine
from .services.generation_service import generate_monthly_routine_if_needed


def get_active_routine_queryset(user):
    return Routine.objects.filter(user=user, is_active=True).prefetch_related(
        "weeks__days__exercises",
    )


def get_active_routine_summary_queryset(user):
    return Routine.objects.filter(user=user, is_active=True).prefetch_related(
        "weeks__days",
    )


class ActiveRoutineView(APIView):
    def get(self, request):
        routine = get_active_routine_queryset(request.user).first()
        if routine is None:
            return Response(
                {"detail": "No active routine found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        summary = request.query_params.get("summary") == "true"
        if summary:
            serializer = RoutineSummarySerializer(routine)
        else:
            serializer = RoutineSerializer(routine)
        return Response(serializer.data)


class ActiveRoutineWeekView(APIView):
    def get(self, request, week_number):
        routine = get_active_routine_queryset(request.user).first()
        if routine is None:
            return Response(
                {"detail": "No active routine found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        week = next(
            (w for w in routine.weeks.all() if w.week_number == week_number),
            None,
        )
        if week is None:
            return Response(
                {"detail": "Week not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = RoutineWeekSerializer(week)
        return Response(serializer.data)


class ActiveRoutineDayView(APIView):
    def get(self, request, day_id):
        routine = get_active_routine_queryset(request.user).first()
        if routine is None:
            return Response(
                {"detail": "No active routine found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        day = next(
            (
                d for w in routine.weeks.all() for d in w.days.all() if str(d.id) == day_id
            ),
            None,
        )
        if day is None:
            return Response(
                {"detail": "Day not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = RoutineDaySerializer(day)
        return Response(serializer.data)


class DevSeedRoutineView(APIView):
    def post(self, request):
        if not settings.DEBUG:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        routine, created = seed_dev_routine(request.user)
        serializer = RoutineSerializer(
            Routine.objects.prefetch_related("weeks__days__exercises").get(id=routine.id)
        )
        return Response(
            {
                "created": created,
                "routine": serializer.data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class GenerateRoutineView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "generate_routine"

    def post(self, request):
        try:
            routine, _ = generate_monthly_routine_if_needed(request.user, return_existing=False)
        except APIException as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )
        except Exception as exc:
            logger.exception("Routine generation failed unexpectedly for user %s", request.user.id)
            return Response(
                {"detail": str(exc), "code": "unexpected_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = RoutineSerializer(routine)
        return Response(
            {
                "detail": "Routine generated successfully.",
                "routine": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
