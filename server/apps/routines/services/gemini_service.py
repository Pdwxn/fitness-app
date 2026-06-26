import json
import os

from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError


_KNOWLEDGE_PREFIX = """
=== BASE DE CONOCIMIENTO: DISEÑO DE ENTRENAMIENTO (Evidencia Científica) ===

## CONCEPTOS DE VOLUMEN

- Volumen = cantidad total de series x repeticiones por grupo muscular por semana
- Rango general recomendado: 6-20 series por grupo muscular por semana
- El volumen debe progresar gradualmente semana a semana (semana 1 ligera -> semana 4 intensa)

Definiciones clave:
- MV  (Volumen de mantenimiento): minimo para no perder musculo
- MEV (Minimo efectivo): a partir de aqui hay hipertrofia real
- MAV (Maximo adaptativo): zona de mayor eficiencia
- MRV (Maximo recuperable): limite superior; excederlo produce sobreentrenamiento

## TABLA DE VOLUMEN POR GRUPO MUSCULAR

Grupo muscular    | MV | MEV | MAV | MRV | Frecuencia/sem | Reps recomendadas
------------------|----|-----|-----|-----|----------------|------------------
Abdominales       |  0 |  16 |  20 |  25 | 3-5            | 8-20
Biceps            |  8 |  14 |  20 |  26 | 2-6            | 8-15
Cuadriceps        |  8 |  12 |  18 |  20 | 1-3            | 8-15
Deltoides frontal |  0 |   6 |   8 |  12 | 1-2            | 6-10
Deltoides lateral |  0 |   8 |  12 |  14 | 2-6            | 10-20
Deltoides post.   |  0 |   8 |  12 |  14 | 2-6            | 10-20
Dorsal            | 10 |  14 |  22 |  25 | 2-4            | 6-20
Femoral           |  6 |  10 |  16 |  20 | 2-3            | 3-20
Gluteo            |  0 |   4 |  12 |  16 | 2-3            | 8-12
Pectoral          | 10 |  12 |  20 |  22 | 1-3            | 8-12
Triceps           |  0 |  12 |  20 |  26 | 2-4            | 6-20

REGLA: El volumen semanal total de cada grupo debe estar entre su MEV y su MRV.
Para usuarios principiantes, empezar cerca del MEV. Para avanzados, acercarse al MAV.
"""

_KNOWLEDGE_SUFFIX = """

## PRINCIPIOS DE DISENO QUE DEBES APLICAR

1. Sobrecarga progresiva: aumentar series, reps o peso semana a semana
2. Frecuencia adecuada: cada grupo muscular 2-4 veces/semana para hipertrofia optima
3. Seleccion de ejercicios: priorizar multiarticulares (sentadilla, press, remo, dominadas)
   antes que aislados (curl, extension)
4. Descanso entre series: 60-90s ejercicios de aislamiento / 2-3min ejercicios compuestos
5. Si hay lesiones: eliminar o sustituir ejercicios que comprometan la zona afectada
6. Semana de descarga (deload) recomendada cada 4-6 semanas (reducir volumen ~40%)

=== FIN BASE DE CONOCIMIENTO ===
"""


def _format_exercise_bank():
    path = os.path.join(os.path.dirname(__file__), "..", "data", "exercise_bank.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    parts = ["\n## BANCO DE EJERCICIOS POR GRUPO MUSCULAR\n"]
    for group in data["muscle_groups"]:
        subgroups = group.get("subgroups")
        if subgroups:
            for sg in subgroups:
                exercises = ", ".join(ex["es"] for ex in sg["exercises"])
                parts.append(f"{group['name']} - {sg['name']}: {exercises}")
        else:
            exercises = ", ".join(ex["es"] for ex in group["exercises"])
            parts.append(f"{group['name']}: {exercises}")
    return "\n".join(parts)


FITNESS_KNOWLEDGE_BASE = _KNOWLEDGE_PREFIX + _format_exercise_bank() + _KNOWLEDGE_SUFFIX


VOLUME_START = {
    "sedentary": "MEV (minimo efectivo)",
    "light": "MEV (minimo efectivo)",
    "moderate": "entre MEV y MAV",
    "active": "MAV (maximo adaptativo)",
    "very_active": "entre MAV y MRV",
}


class GeminiConfigurationError(APIException):
    status_code = 503
    default_detail = "Gemini API key is not configured."
    default_code = "gemini_not_configured"


class GeminiResponseError(APIException):
    status_code = 502
    default_detail = "Gemini returned an invalid routine response."
    default_code = "invalid_gemini_response"


class GeminiGenerationError(APIException):
    status_code = 502
    default_detail = "Gemini could not generate a routine right now."
    default_code = "gemini_generation_failed"


class GeminiQuotaError(APIException):
    status_code = 429
    default_detail = "Gemini quota exceeded. Check your API key plan, billing, or rate limits."
    default_code = "gemini_quota_exceeded"


def build_routine_prompt(user, previous_month_notes=None):
    health = user.health_data
    previous_month_notes = previous_month_notes or []
    volume_target = VOLUME_START.get(health.activity_level, "MEV")

    return f"""
{FITNESS_KNOWLEDGE_BASE}

Eres un entrenador personal experto. Usa la base de conocimiento anterior
para generar una rutina mensual de entrenamiento personalizada.
Devuelve SOLO un objeto JSON valido, sin texto adicional ni bloques de codigo.

PERFIL DEL USUARIO:
- Nombre: {user.full_name}
- Genero: {user.gender}
- Edad: {user.age} anos
- Peso: {user.weight_kg} kg
- Altura: {user.height_cm} cm
- Nivel de actividad: {health.activity_level}
- Punto de volumen de partida segun su nivel: {volume_target}
- Metas generales: {', '.join(health.physical_goals)}
- Meta especifica del usuario: {health.specific_goal or 'No especificada'}
- Lesiones o limitaciones: {json.dumps(health.injuries, ensure_ascii=False)}
- Equipamiento disponible: {health.equipment_type}
- Equipamiento especifico en casa: {', '.join(health.available_equipment) if health.available_equipment else 'N/A'}
- Tipo de rutina: {health.routine_type}

NOTAS DEL MES ANTERIOR:
{json.dumps(previous_month_notes, ensure_ascii=False) if previous_month_notes else 'No hay notas previas (primera rutina del usuario).'}

INSTRUCCIONES:
1. La rutina debe abarcar 4 semanas completas con progresion gradual.
2. Semana 1: volumen inicial. Semana 4: volumen pico segun el nivel.
3. Respeta la tabla de volumen: cada grupo muscular entre su MEV y MRV semanal.
4. Selecciona ejercicios del banco de ejercicios y prioriza multiarticulares.
5. Adapta prioridades segun genero, meta especifica, lesiones y equipamiento.
6. Selecciona UNICAMENTE ejercicios ejecutables con el equipamiento disponible.
7. Para cada ejercicio incluye nombre en espanol, grupo muscular, series, reps,
   peso inicial en kg, descanso en segundos, instrucciones, search_term en ingles
   y 2-3 variantes.
8. Incluye dias de descanso segun el tipo de rutina elegido.

FORMATO JSON EXACTO:
{{
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Adaptacion",
      "notes": "Notas generales de la semana",
      "days": [
        {{
          "day_number": 1,
          "day_name": "Push",
          "is_rest_day": false,
          "exercises": [
            {{
              "name": "Press de banca",
              "muscle_group": "Pectoral",
              "sets": 4,
              "reps": "8-12",
              "weight_kg": 40,
              "rest_seconds": 120,
              "instructions": "Agarre ligeramente mas ancho que los hombros.",
              "search_term": "barbell bench press",
              "variants": [
                {{"name": "Press inclinado", "description": "Mayor enfasis en pectoral superior"}},
                {{"name": "Press con mancuernas", "description": "Mayor rango de movimiento"}}
              ]
            }}
          ]
        }}
      ]
    }}
  ]
}}
""".strip()


def generate_routine_with_gemini(user, previous_month_notes=None):
    if not settings.GEMINI_API_KEY:
        raise GeminiConfigurationError()

    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise GeminiConfigurationError("Gemini package is not installed.") from exc

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = build_routine_prompt(user, previous_month_notes=previous_month_notes)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.4,
                "max_output_tokens": 32768,
                "response_mime_type": "application/json",
            },
            request_options={"timeout": 60000},
        )
        return response.text
    except Exception as exc:
        message = str(exc)
        if "quota" in message.lower() or "429" in message:
            raise GeminiQuotaError() from exc
        raise GeminiGenerationError(str(exc)) from exc


def parse_gemini_routine_response(raw_response):
    if isinstance(raw_response, dict):
        return validate_routine_payload(raw_response)

    if not isinstance(raw_response, str) or not raw_response.strip():
        raise GeminiResponseError("Gemini returned an empty response.")

    raw = raw_response.strip()
    if raw.startswith("```"):
        raw = raw.removeprefix("```").strip()
        if raw.startswith("json"):
            raw = raw.removeprefix("json").strip()
        if raw.endswith("```"):
            raw = raw.removesuffix("```").strip()

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise GeminiResponseError("Gemini response does not contain a JSON object.")

    try:
        payload = json.loads(raw[start : end + 1])
    except json.JSONDecodeError as exc:
        if "Unterminated string" in str(exc) or end == len(raw) - 1:
            raise GeminiResponseError(
                "Gemini response was truncated before valid JSON completed."
            ) from exc
        raise GeminiResponseError("Gemini response is not valid JSON.") from exc

    try:
        return validate_routine_payload(payload)
    except ValidationError as exc:
        raise GeminiResponseError(exc.detail) from exc


def validate_routine_payload(payload):
    if not isinstance(payload, dict):
        raise ValidationError("Routine payload must be a JSON object.")

    weeks = payload.get("weeks")
    if not isinstance(weeks, list) or len(weeks) != 4:
        raise ValidationError({"weeks": "Routine must include exactly 4 weeks."})

    normalized_weeks = []
    seen_weeks = set()
    for week in weeks:
        normalized_week = validate_week_payload(week)
        week_number = normalized_week["week_number"]
        if week_number in seen_weeks:
            raise ValidationError({"weeks": f"Week {week_number} is duplicated."})
        seen_weeks.add(week_number)
        normalized_weeks.append(normalized_week)

    expected_weeks = {1, 2, 3, 4}
    if seen_weeks != expected_weeks:
        raise ValidationError({"weeks": "Routine weeks must be numbered 1 through 4."})

    normalized_weeks.sort(key=lambda week: week["week_number"])
    return {"weeks": normalized_weeks}


def validate_week_payload(week):
    if not isinstance(week, dict):
        raise ValidationError("Each week must be an object.")

    week_number = coerce_int(week.get("week_number"), "week_number")
    if week_number < 1 or week_number > 4:
        raise ValidationError({"week_number": "Week number must be between 1 and 4."})

    days = week.get("days")
    if not isinstance(days, list) or len(days) != 7:
        raise ValidationError({"days": f"Week {week_number} must include exactly 7 days."})

    normalized_days = []
    seen_days = set()
    for day in days:
        normalized_day = validate_day_payload(day)
        day_number = normalized_day["day_number"]
        if day_number in seen_days:
            raise ValidationError({"days": f"Day {day_number} is duplicated in week {week_number}."})
        seen_days.add(day_number)
        normalized_days.append(normalized_day)

    expected_days = {1, 2, 3, 4, 5, 6, 7}
    if seen_days != expected_days:
        raise ValidationError({"days": f"Week {week_number} days must be numbered 1 through 7."})

    normalized_days.sort(key=lambda day: day["day_number"])
    return {
        "week_number": week_number,
        "focus": clean_text(week.get("focus", ""), 120),
        "notes": clean_text(week.get("notes", "")),
        "days": normalized_days,
    }


def validate_day_payload(day):
    if not isinstance(day, dict):
        raise ValidationError("Each day must be an object.")

    day_number = coerce_int(day.get("day_number"), "day_number")
    if day_number < 1 or day_number > 7:
        raise ValidationError({"day_number": "Day number must be between 1 and 7."})

    is_rest_day = bool(day.get("is_rest_day", False))
    exercises = day.get("exercises", [])
    if not isinstance(exercises, list):
        raise ValidationError({"exercises": "Exercises must be a list."})

    normalized_exercises = []
    for order, exercise in enumerate(exercises, start=1):
        normalized_exercises.append(validate_exercise_payload(exercise, order))

    return {
        "day_number": day_number,
        "day_name": clean_required_text(day.get("day_name"), "day_name", 40),
        "is_rest_day": is_rest_day,
        "exercises": normalized_exercises,
    }


def validate_exercise_payload(exercise, fallback_order):
    if not isinstance(exercise, dict):
        raise ValidationError("Each exercise must be an object.")

    sets = exercise.get("sets")
    rest_seconds = exercise.get("rest_seconds")
    weight_kg = exercise.get("weight_kg")

    return {
        "name": clean_required_text(exercise.get("name"), "name", 120),
        "muscle_group": clean_text(exercise.get("muscle_group", ""), 80),
        "sets": coerce_int(sets, "sets") if sets not in (None, "") else None,
        "reps": clean_text(exercise.get("reps", ""), 40),
        "weight_kg": coerce_decimal_string(weight_kg, "weight_kg") if weight_kg not in (None, "") else None,
        "rest_seconds": coerce_int(rest_seconds, "rest_seconds") if rest_seconds not in (None, "") else None,
        "instructions": clean_text(exercise.get("instructions", "")),
        "search_term": clean_text(exercise.get("search_term", ""), 120),
        "variants": exercise.get("variants", []) if isinstance(exercise.get("variants", []), list) else [],
        "order": coerce_int(exercise.get("order", fallback_order), "order"),
    }


def clean_required_text(value, field_name, max_length=None):
    cleaned = clean_text(value, max_length)
    if not cleaned:
        raise ValidationError({field_name: "This field is required."})
    return cleaned


def clean_text(value, max_length=None):
    if value is None:
        return ""
    cleaned = str(value).strip()
    if max_length is not None:
        return cleaned[:max_length]
    return cleaned


def coerce_int(value, field_name):
    try:
        result = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Must be an integer."}) from exc
    if result < 0:
        raise ValidationError({field_name: "Must be zero or greater."})
    return result


def coerce_decimal_string(value, field_name):
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Must be a number."}) from exc
    if result < 0:
        raise ValidationError({field_name: "Must be zero or greater."})
    return f"{result:.2f}"
