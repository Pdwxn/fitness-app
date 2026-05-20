from django.contrib import admin

from .models import UserHealthData


@admin.register(UserHealthData)
class UserHealthDataAdmin(admin.ModelAdmin):
    list_display = ("user", "activity_level", "equipment_type", "routine_type", "updated_at")
    list_filter = ("activity_level", "equipment_type", "routine_type")
    search_fields = ("user__id", "user__full_name", "specific_goal")
