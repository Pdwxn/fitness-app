from django.urls import path

from .views import DailyLogBatchView, DailyLogDetailView, DailyLogListCreateView, ProgressStatsView


urlpatterns = [
    path("logs/", DailyLogListCreateView.as_view(), name="progress-logs"),
    path("logs/batch/", DailyLogBatchView.as_view(), name="progress-logs-batch"),
    path("logs/<uuid:log_id>/", DailyLogDetailView.as_view(), name="progress-log-detail"),
    path("stats/", ProgressStatsView.as_view(), name="progress-stats"),
]
