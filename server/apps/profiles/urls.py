from django.urls import path

from .views import ProfileHealthView, ProfileView

urlpatterns = [
    path("", ProfileView.as_view(), name="profile"),
    path("health/", ProfileHealthView.as_view(), name="profile-health"),
]
