from django.urls import path

from .views import OnboardingCompleteView, OnboardingStatusView


urlpatterns = [
    path("status/", OnboardingStatusView.as_view(), name="onboarding-status"),
    path("complete/", OnboardingCompleteView.as_view(), name="onboarding-complete"),
]
