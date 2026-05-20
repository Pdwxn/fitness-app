from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "preferred_language", "preferred_units", "created_at")
    search_fields = ("id", "full_name")
    list_filter = ("preferred_language", "preferred_units")
