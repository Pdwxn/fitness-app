from django.urls import path
from django.views.decorators.cache import cache_page

from .views import ExerciseCatalogView


urlpatterns = [
    # Catalog changes only when the importer runs; not per-user, so no Vary header.
    path("", cache_page(60 * 60)(ExerciseCatalogView.as_view()), name="exercise-catalog"),
]
