from django.urls import path

from .views import ExerciseCatalogView


urlpatterns = [
    path("", ExerciseCatalogView.as_view(), name="exercise-catalog"),
]
