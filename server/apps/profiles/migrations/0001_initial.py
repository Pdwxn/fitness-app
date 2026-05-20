# Generated for Sprint 3 profile health data.

import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("users", "0002_userprofile_personal_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserHealthData",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "activity_level",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("sedentary", "Sedentary"),
                            ("light", "Light"),
                            ("moderate", "Moderate"),
                            ("active", "Active"),
                            ("very_active", "Very active"),
                        ],
                        max_length=20,
                    ),
                ),
                ("physical_goals", models.JSONField(blank=True, default=list)),
                ("specific_goal", models.TextField(blank=True)),
                ("injuries", models.JSONField(blank=True, default=list)),
                (
                    "equipment_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("gym", "Gym"),
                            ("home", "Home"),
                            ("calisthenics", "Calisthenics"),
                        ],
                        max_length=20,
                    ),
                ),
                ("available_equipment", models.JSONField(blank=True, default=list)),
                (
                    "routine_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("push_pull_legs", "Push/Pull/Legs"),
                            ("upper_lower", "Upper/Lower"),
                            ("hybrid", "Hybrid"),
                            ("5_days", "5 days"),
                        ],
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="health_data",
                        to="users.userprofile",
                    ),
                ),
            ],
        ),
    ]
