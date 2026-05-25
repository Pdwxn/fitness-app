from django.contrib import admin

from .models import DailyLog


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ("user", "routine_day", "date", "completed", "created_at")
    list_filter = ("completed", "date")
    search_fields = ("user__full_name", "user__id", "routine_day__day_name")
    readonly_fields = ("created_at", "updated_at")
