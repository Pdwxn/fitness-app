from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Routine, RoutineDay, RoutineWeek
from .serializers import RoutineDaySerializer, RoutineSerializer, RoutineWeekSerializer
from .services.dev_seed import seed_dev_routine
from .services.generation_service import generate_and_persist_routine


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
    def post(self, request):
        routine = generate_and_persist_routine(request.user)
        serializer = RoutineSerializer(routine)
        return Response(
            {
                "detail": "Routine generated successfully.",
                "routine": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
