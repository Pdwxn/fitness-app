from django.urls import path

from .views import ActiveRoutineDayView, ActiveRoutineView, ActiveRoutineWeekView


urlpatterns = [
    path("active/", ActiveRoutineView.as_view(), name="active-routine"),
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
]
