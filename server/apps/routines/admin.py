from django.contrib import admin

from .models import Routine, RoutineDay, RoutineExercise, RoutineWeek


class RoutineWeekInline(admin.TabularInline):
    model = RoutineWeek
    extra = 0


class RoutineDayInline(admin.TabularInline):
    model = RoutineDay
    extra = 0


class RoutineExerciseInline(admin.TabularInline):
    model = RoutineExercise
    extra = 0


@admin.register(Routine)
class RoutineAdmin(admin.ModelAdmin):
    list_display = ("user", "month", "year", "is_active", "generated_at", "created_at")
    list_filter = ("is_active", "year", "month")
    search_fields = ("user__full_name", "user__id")
    inlines = (RoutineWeekInline,)


@admin.register(RoutineWeek)
class RoutineWeekAdmin(admin.ModelAdmin):
    list_display = ("routine", "week_number", "focus", "created_at")
    list_filter = ("week_number",)
    search_fields = ("routine__user__full_name", "routine__user__id", "focus")
    inlines = (RoutineDayInline,)


@admin.register(RoutineDay)
class RoutineDayAdmin(admin.ModelAdmin):
    list_display = ("week", "day_number", "day_name", "is_rest_day", "created_at")
    list_filter = ("is_rest_day", "day_number")
    search_fields = ("week__routine__user__full_name", "week__routine__user__id", "day_name")
    inlines = (RoutineExerciseInline,)


@admin.register(RoutineExercise)
class RoutineExerciseAdmin(admin.ModelAdmin):
    list_display = ("day", "order", "name", "muscle_group", "sets", "reps", "rest_seconds")
    list_filter = ("muscle_group",)
    search_fields = ("name", "muscle_group", "day__week__routine__user__full_name")
