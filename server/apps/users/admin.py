from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "full_name",
        "gender",
        "age",
        "preferred_language",
        "preferred_units",
        "created_at",
    )
    search_fields = ("id", "full_name")
    list_filter = ("gender", "preferred_language", "preferred_units")
