from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.routines.models import RoutineDay

from .models import DailyLog
from .serializers import DailyLogBatchSerializer, DailyLogSerializer, ProgressStatsSerializer


def get_user_logs(user):
    return DailyLog.objects.filter(user=user).select_related("routine_day", "routine_day__week", "routine_day__week__routine")


def calculate_stats(logs):
    completed_days = 0
    total_exercises_completed = 0

    for log in logs:
        if log.completed:
            completed_days += 1
        total_exercises_completed += sum(
            1 for exercise in log.exercises_done if exercise.get("completed")
        )

    return {
        "completed_days": completed_days,
        "total_exercises_completed": total_exercises_completed,
        "pending_sync": 0,
    }


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
        return Response(DailyLogSerializer(log).data, status=status.HTTP_201_CREATED)


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

        with transaction.atomic():
            for log_data in serializer.validated_data["logs"]:
                routine_day_id = log_data.pop("routine_day_id")
                routine_day = RoutineDay.objects.get(id=routine_day_id, week__routine__user=request.user)
                log_id = log_data.pop("id", None)
                lookup = Q(user=request.user, routine_day=routine_day, date=log_data["date"])
                if log_id:
                    lookup |= Q(id=log_id, user=request.user)

                existing = DailyLog.objects.filter(lookup).first()
                if existing:
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

        return Response(
            {
                "created": created,
                "updated": updated,
                "logs": DailyLogSerializer(logs, many=True).data,
            }
        )


class ProgressStatsView(APIView):
    def get(self, request):
        stats = calculate_stats(get_user_logs(request.user))
        serializer = ProgressStatsSerializer(stats)
        return Response(serializer.data)
