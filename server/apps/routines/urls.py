from django.urls import path

from .views import (
    ActiveRoutineDayView,
    ApproveProposalView,
    ActiveRoutineView,
    ActiveRoutineWeekView,
    DevSeedRoutineView,
    GenerateRoutineView,
    ManualRoutineDetailView,
    ManualRoutineView,
    PendingProposalView,
    RejectProposalView,
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
    path("proposals/pending/", PendingProposalView.as_view(), name="proposal-pending"),
    path(
        "proposals/<uuid:proposal_id>/approve/",
        ApproveProposalView.as_view(),
        name="proposal-approve",
    ),
    path(
        "proposals/<uuid:proposal_id>/reject/",
        RejectProposalView.as_view(),
        name="proposal-reject",
    ),
    path(
        "<uuid:routine_id>/deactivate/",
        RoutineDeactivateView.as_view(),
        name="routine-deactivate",
    ),
    path(
        "<uuid:routine_id>/",
        ManualRoutineDetailView.as_view(),
        name="routine-detail",
    ),
    path("dev/seed/", DevSeedRoutineView.as_view(), name="dev-seed-routine"),
]
