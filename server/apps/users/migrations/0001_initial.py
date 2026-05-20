# Generated for Sprint 2 auth foundation.

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("full_name", models.CharField(blank=True, max_length=100)),
                (
                    "preferred_language",
                    models.CharField(
                        choices=[("es", "Spanish"), ("en", "English")],
                        default="es",
                        max_length=5,
                    ),
                ),
                (
                    "preferred_units",
                    models.CharField(
                        choices=[("metric", "Metric"), ("imperial", "Imperial")],
                        default="metric",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
