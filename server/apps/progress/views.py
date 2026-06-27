from django.db import transaction
from django.db.models import Count, IntegerField, Q, Sum, Value
from django.db.models.expressions import RawSQL
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.routines.models import Routine, RoutineDay
from apps.routines.services.generation_service import (
    generate_monthly_routine_if_needed,
    get_routine_daily_notes,
    is_routine_completed,
)

from .models import DailyLog
from .serializers import DailyLogBatchSerializer, DailyLogSerializer, ProgressStatsSerializer


def get_user_logs(user):
    return DailyLog.objects.filter(user=user).select_related("routine_day", "routine_day__week", "routine_day__week__routine")


def calculate_stats(user):
    agg = DailyLog.objects.filter(user=user).aggregate(
        completed_days=Count("id", filter=Q(completed=True)),
        total_exercises_completed=Coalesce(
            Sum(
                RawSQL(
                    "(SELECT COUNT(*) FROM jsonb_array_elements(exercises_done) AS elem WHERE (elem->>'completed')::boolean = true)",
                    [],
                ),
            ),
            Value(0),
            output_field=IntegerField(),
        ),
    )

    return {
        "completed_days": agg["completed_days"],
        "total_exercises_completed": agg["total_exercises_completed"],
        "pending_sync": 0,
    }


def try_generate_next_routine(user):
    from datetime import date

    import logging

    logger = logging.getLogger(__name__)

    try:
        active_routine = Routine.objects.get(user=user, is_active=True)
        if not is_routine_completed(user, active_routine):
            return None

        next_month = active_routine.month % 12 + 1
        next_year = active_routine.year + (1 if active_routine.month == 12 else 0)
        notes = get_routine_daily_notes(user, active_routine)

        new_routine, created = generate_monthly_routine_if_needed(
            user,
            today=date(next_year, next_month, 1),
            previous_month_notes=notes,
            return_existing=True,
        )
        if created:
            return {"id": str(new_routine.id), "month": new_routine.month, "year": new_routine.year}
        return None
    except Routine.DoesNotExist:
        return None
    except Exception:
        logger.exception("Failed to generate next month routine for user %s", user)
        return None


class DailyLogListCreateView(APIView):
    def get(self, request):
        logs = get_user_logs(request.user)
        routine_day_id = request.query_params.get("routine_day_id")
        if routine_day_id:
            logs = logs.filter(routine_day_id=routine_day_id)

        serializer = DailyLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DailyLogSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        log = serializer.save()

        response_data = DailyLogSerializer(log).data
        next_routine_data = try_generate_next_routine(request.user)
        if next_routine_data:
            response_data["next_routine"] = next_routine_data

        return Response(response_data, status=status.HTTP_201_CREATED)


class DailyLogDetailView(APIView):
    def patch(self, request, log_id):
        log = get_user_logs(request.user).filter(id=log_id).first()
        if log is None:
            return Response({"detail": "Log not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = DailyLogSerializer(
            log,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DailyLogBatchView(APIView):
    def post(self, request):
        serializer = DailyLogBatchSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        created = 0
        updated = 0
        logs = []
        log_data_list = serializer.validated_data["logs"]

        routine_day_ids = [ld["routine_day_id"] for ld in log_data_list]
        routine_days = RoutineDay.objects.filter(
            id__in=routine_day_ids, week__routine__user=request.user
        ).in_bulk()

        existing_logs_qs = DailyLog.objects.filter(
            user=request.user,
            routine_day_id__in=routine_day_ids,
        )
        existing_by_id = {}
        existing_by_key = {}
        for log in existing_logs_qs:
            existing_by_id[str(log.id)] = log
            existing_by_key[(str(log.routine_day_id), str(log.date))] = log

        with transaction.atomic():
            for log_data in log_data_list:
                routine_day_id = log_data.pop("routine_day_id")
                routine_day = routine_days.get(routine_day_id)
                log_id = log_data.pop("id", None)

                existing = None
                if log_id and log_id in existing_by_id:
                    existing = existing_by_id[log_id]
                elif routine_day:
                    key = (str(routine_day_id), str(log_data["date"]))
                    existing = existing_by_key.get(key)

                if existing:
                    existing = DailyLog.objects.select_for_update().get(pk=existing.pk)
                    for field, value in log_data.items():
                        setattr(existing, field, value)
                    existing.routine_day = routine_day
                    existing.save()
                    updated += 1
                    logs.append(existing)
                else:
                    log = DailyLog.objects.create(
                        user=request.user,
                        routine_day=routine_day,
                        **log_data,
                    )
                    created += 1
                    logs.append(log)

        response_data = {
            "created": created,
            "updated": updated,
            "logs": DailyLogSerializer(logs, many=True).data,
        }
        next_routine_data = try_generate_next_routine(request.user)
        if next_routine_data:
            response_data["next_routine"] = next_routine_data

        return Response(response_data)


class ProgressStatsView(APIView):
    def get(self, request):
        stats = calculate_stats(request.user)
        serializer = ProgressStatsSerializer(stats)
        return Response(serializer.data)
