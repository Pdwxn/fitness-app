import logging

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_headers
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import Routine, RoutineEditProposal, StoredExercise
from .serializers import (
    ManualRoutineInputSerializer,
    RoutineDaySerializer,
    RoutineEditProposalSerializer,
    RoutineSerializer,
    RoutineSummarySerializer,
    RoutineWeekSerializer,
    StoredExerciseSerializer,
)
from .services import coach_service
from .services.dev_seed import seed_dev_routine
from .services.generation_service import (
    RoutineNotEditableError,
    delete_manual_routine,
    generate_monthly_routine_if_needed,
    persist_manual_routine,
    update_manual_routine,
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
        # With enough logged history, the AI coach proposes edits to the current
        # routine instead of replacing it (see services/coach_service.py).
        try:
            outcome = coach_service.propose_edit_if_eligible(request.user)
        except APIException as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )
        if outcome.kind == "proposal":
            return Response(
                {
                    "detail": "The AI coach prepared a proposal for your routine.",
                    "mode": "proposal",
                    "proposal": RoutineEditProposalSerializer(outcome.proposal).data,
                },
                status=status.HTTP_200_OK,
            )
        if outcome.kind == "unchanged":
            return Response(
                {
                    "detail": "The AI coach found nothing to change; your routine continues.",
                    "mode": "unchanged",
                    "routine": RoutineSerializer(
                        Routine.objects.prefetch_related("weeks__days__exercises").get(
                            pk=outcome.routine.pk
                        )
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

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
                "mode": "routine",
                "routine": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class ExerciseCatalogPagination(PageNumberPagination):
    page_size = 200
    page_size_query_param = "page_size"
    max_page_size = 1000


class ExerciseCatalogView(ListAPIView):
    """Exercise catalog for the offline routine builder.

    ``StoredExercise.objects`` (ActiveManager) already excludes soft-deleted rows.
    Deliberately not response-cached: this used to sit behind ``cache_page`` at
    the URLconf level, but a time-based cache keyed by the full query string
    has no way to know a bulk dataset import (``import_exercisedb``, run
    rarely but at unpredictable times) just changed every row underneath it —
    it kept serving pre-import data for up to the cache timeout with zero
    signal anything was wrong (this is exactly what happened switching
    datasets: stale ``count``/rows from before the swap). Same reasoning that
    already dropped ``cache_page`` from the ``ActiveRoutine*`` views. The
    client's own delta sync (``?updated_since=``, see below) is what keeps
    repeat requests cheap instead.

    ``?updated_since=<iso-datetime>`` returns only rows changed after that
    instant (see ``apps.routines.services.exercise_sync`` for how the importer
    keeps ``updated_at`` meaningful for this). Without it, returns the full
    catalog.
    """

    serializer_class = StoredExerciseSerializer
    pagination_class = ExerciseCatalogPagination

    def get_queryset(self):
        queryset = StoredExercise.objects.all().order_by("external_id")

        updated_since = self.request.query_params.get("updated_since")
        if updated_since:
            queryset = queryset.filter(updated_at__gt=_parse_updated_since(updated_since))

        return queryset


def _parse_updated_since(value):
    parsed = parse_datetime(value)
    if parsed is None:
        raise ValidationError({"updated_since": "Must be an ISO-8601 datetime."})
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


class ExerciseRemovedView(APIView):
    """Exercises removed from the catalog since ``?updated_since=``.

    The delta list above only carries active rows, so without this a client that
    already synced would keep a removed exercise forever. Each item carries its
    ``updated_at`` so the client can move its sync cursor past the removal
    instead of asking for it again on every sync.
    """

    def get(self, request):
        updated_since = request.query_params.get("updated_since")
        if not updated_since:
            raise ValidationError({"updated_since": "This query parameter is required."})

        rows = (
            StoredExercise.all_objects.filter(
                deleted_at__isnull=False, updated_at__gt=_parse_updated_since(updated_since)
            )
            .order_by("external_id")
            .values("external_id", "updated_at")
        )
        return Response({"removed": list(rows)})


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


class ManualRoutineDetailView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "manual_routine"

    def _get_owned_routine(self, request, routine_id):
        return Routine.objects.filter(id=routine_id, user=request.user).first()

    def patch(self, request, routine_id):
        routine = self._get_owned_routine(request, routine_id)
        if routine is None:
            return Response(
                {"detail": "Routine not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ManualRoutineInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = update_manual_routine(routine, serializer.validated_data)
        except APIException as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )

        return Response(RoutineSerializer(updated).data)

    def delete(self, request, routine_id):
        routine = self._get_owned_routine(request, routine_id)
        if routine is None:
            return Response(
                {"detail": "Routine not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            delete_manual_routine(routine)
        except RoutineNotEditableError as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


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



def _get_own_pending_proposal(user, proposal_id):
    return (
        RoutineEditProposal.objects.filter(
            id=proposal_id, routine__user=user, routine__deleted_at__isnull=True
        )
        .select_related("routine")
        .first()
    )


class PendingProposalView(APIView):
    """The AI coach's pending proposal for the user's active routine, if any."""

    def get(self, request):
        proposal = (
            RoutineEditProposal.objects.filter(
                routine__user=request.user,
                routine__is_active=True,
                routine__deleted_at__isnull=True,
                status=RoutineEditProposal.Status.PENDING,
            )
            .select_related("routine")
            .first()
        )
        if proposal is None:
            return Response({"detail": "No pending proposal."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RoutineEditProposalSerializer(proposal).data)


class _ProposalDecisionView(APIView):
    decide = None  # set by subclasses

    def post(self, request, proposal_id):
        proposal = _get_own_pending_proposal(request.user, proposal_id)
        if proposal is None:
            return Response({"detail": "Proposal not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            routine = type(self).decide(proposal)
        except APIException as exc:
            return Response(
                {"detail": exc.detail, "code": exc.get_codes()},
                status=exc.status_code,
            )
        return Response(RoutineSerializer(routine).data)


class ApproveProposalView(_ProposalDecisionView):
    decide = staticmethod(coach_service.approve_proposal)


class RejectProposalView(_ProposalDecisionView):
    decide = staticmethod(coach_service.reject_proposal)
