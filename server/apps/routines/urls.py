from django.urls import path

from .views import (
    ActiveRoutineDayView,
    ActiveRoutineView,
    ActiveRoutineWeekView,
    DevSeedRoutineView,
    GenerateRoutineView,
    ManualRoutineView,
    RoutineDeactivateView,
)


urlpatterns = [
    path("active/", ActiveRoutineView.as_view(), name="active-routine"),
    path("generate/", GenerateRoutineView.as_view(), name="generate-routine"),
    path("manual/", ManualRoutineView.as_view(), name="manual-routine"),
    path(
        "active/week/<int:week_number>/",
        ActiveRoutineWeekView.as_view(),
        name="active-routine-week",
    ),
    path(
        "active/day/<uuid:day_id>/",
        ActiveRoutineDayView.as_view(),
        name="active-routine-day",
    ),
    path(
        "<uuid:routine_id>/deactivate/",
        RoutineDeactivateView.as_view(),
        name="routine-deactivate",
    ),
    path("dev/seed/", DevSeedRoutineView.as_view(), name="dev-seed-routine"),
]
