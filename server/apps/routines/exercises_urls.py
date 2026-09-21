from django.urls import path

from .views import ExerciseCatalogView, ExerciseRemovedView


urlpatterns = [
    path("", ExerciseCatalogView.as_view(), name="exercise-catalog"),
    path("removed/", ExerciseRemovedView.as_view(), name="exercise-removed"),
]
