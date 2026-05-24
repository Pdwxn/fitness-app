from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Routine, RoutineDay, RoutineWeek
from .serializers import RoutineDaySerializer, RoutineSerializer, RoutineWeekSerializer


def get_active_routine_queryset(user):
    return Routine.objects.filter(user=user, is_active=True).prefetch_related(
        "weeks__days__exercises",
    )


class ActiveRoutineView(APIView):
    def get(self, request):
        routine = get_active_routine_queryset(request.user).first()
        if routine is None:
            return Response(
                {"detail": "No active routine found."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        week = get_object_or_404(
            RoutineWeek.objects.prefetch_related("days__exercises"),
            routine=routine,
            week_number=week_number,
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

        day = get_object_or_404(
            RoutineDay.objects.prefetch_related("exercises"),
            id=day_id,
            week__routine=routine,
        )
        serializer = RoutineDaySerializer(day)
        return Response(serializer.data)
