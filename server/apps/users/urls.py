from django.urls import path

from .views import MeView, SyncUserView

urlpatterns = [
    path("me/", MeView.as_view(), name="auth-me"),
    path("sync/", SyncUserView.as_view(), name="auth-sync"),
]
