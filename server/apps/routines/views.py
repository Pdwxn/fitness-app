import logging

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_headers
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import Routine, StoredExercise
from .serializers import (
    ManualRoutineInputSerializer,
    RoutineDaySerializer,
    RoutineSerializer,
    RoutineSummarySerializer,
    RoutineWeekSerializer,
    StoredExerciseSerializer,
)
from .services.dev_seed import seed_dev_routine
from .services.generation_service import (
    generate_monthly_routine_if_needed,
    persist_manual_routine,
)


def get_active_routine_queryset(user):
    return Routine.objects.filter(user=user, is_active=True).prefetch_related(
        "weeks__days__exercises",
    )


def get_active_routine_summary_queryset(user):
    return Routine.objects.filter(user=user, is_active=True).prefetch_related(
        "weeks__days",
    )


class ActiveRoutineView(APIView):
    @method_decorator(vary_on_headers("Authorization"))
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
    @method_decorator(vary_on_headers("Authorization"))
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
    @method_decorator(vary_on_headers("Authorization"))
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


class ExerciseCatalogPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = "page_size"
    max_page_size = 1000


class ExerciseCatalogView(ListAPIView):
    """Full exercise catalog for the offline routine builder.

    ``StoredExercise.objects`` (ActiveManager) already excludes soft-deleted rows.
    Response caching is applied at the URLconf level (see ``urls.py``).
    """

    serializer_class = StoredExerciseSerializer
    pagination_class = ExerciseCatalogPagination

    def get_queryset(self):
        return StoredExercise.objects.all().order_by("external_id")


class ManualRoutineView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "manual_routine"

    def post(self, request):
        serializer = ManualRoutineInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            routine = persist_manual_routine(request.user, serializer.validated_data)
        except APIException as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )
        return Response(RoutineSerializer(routine).data, status=status.HTTP_201_CREATED)


class RoutineDeactivateView(APIView):
    def post(self, request, routine_id):
        routine = Routine.objects.filter(id=routine_id, user=request.user).first()
        if routine is None:
            return Response(
                {"detail": "Routine not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if routine.is_active:
            routine.is_active = False
            routine.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
