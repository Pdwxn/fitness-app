import json
import os

from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError

from .routine_validation import validate_routine_payload


_KNOWLEDGE_PREFIX = """
=== BASE DE CONOCIMIENTO: DISENO DE ENTRENAMIENTO (Evidencia Cientifica) ===

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


EXPERIENCE_COMPLEXITY = {
    "beginner": "ejercicios basicos con tecnica simple, peso ligero a moderado, progresion lenta",
    "intermediate": "ejercicios de dificultad media, tecnica consolidada, peso moderado a alto",
    "advanced": "ejercicios complejos, variaciones avanzadas, tecnicas de intensidad (drop sets, superseries)",
}

INTENSITY_RIR = {
    "always_failure": "el usuario quiere llegar siempre al fallo. Debes disenar series RIR 0, con repes hasta no poder mas",
    "near_failure": "el usuario prefiere quedar a 1-2 repes del fallo. RIR 1-2 objetivo",
    "comfortable": "el usuario prefiere quedarse a 3+ repes del fallo. RIR 3+ objetivo",
}


def build_routine_prompt(user, previous_month_notes=None):
    profile = user
    health = user.health_data
    previous_month_notes = previous_month_notes or []
    volume_target = VOLUME_START.get(health.activity_level, "MEV")

    experience_desc = EXPERIENCE_COMPLEXITY.get(profile.experience_level, "nivel mixto")
    intensity_rir = INTENSITY_RIR.get(profile.intensity_preference, "RIR moderado")
    priority_muscles = profile.priority_muscles or []
    medical_conditions = profile.medical_conditions or []
    training_style = profile.training_style or health.routine_type or "general"
    days_per_week = profile.days_per_week or 3
    session_minutes = profile.session_duration_minutes or 60

    return f"""
{FITNESS_KNOWLEDGE_BASE}

Eres un entrenador personal experto. Usa la base de conocimiento anterior
para generar una rutina mensual de entrenamiento personalizada.
Devuelve SOLO un objeto JSON valido, sin texto adicional ni bloques de codigo.

PERFIL DEL USUARIO:
- Nombre: {profile.full_name}
- Genero: {profile.gender}
- Edad: {profile.age} anos
- Peso: {profile.weight_kg} kg
- Altura: {profile.height_cm} cm
- Nivel de experiencia: {profile.experience_level} ({experience_desc})
- Estilo de entrenamiento: {training_style}
- Nivel de actividad: {health.activity_level}
- Punto de volumen de partida segun su nivel: {volume_target}
- Metas generales: {', '.join(health.physical_goals)}
- Meta especifica del usuario: {health.specific_goal or 'No especificada'}
- Musculos prioritarios (mas volumen semanal): {', '.join(priority_muscles) if priority_muscles else 'Ninguno en particular'}
- Condiciones medicas a considerar: {json.dumps(medical_conditions, ensure_ascii=False) if medical_conditions else 'Ninguna'}
- Lesiones o limitaciones: {json.dumps(health.injuries, ensure_ascii=False)}
- Intensidad preferida: {profile.intensity_preference} ({intensity_rir})
- Equipamiento disponible: {health.equipment_type}
- Equipamiento especifico en casa: {', '.join(health.available_equipment) if health.available_equipment else 'N/A'}
- Tipo de rutina: {health.routine_type}
- Dias por semana de entrenamiento: {days_per_week}
- Duracion por sesion: {session_minutes} minutos

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
9. ASIGNA MAS VOLUMEN a los musculos prioritarios: {', '.join(priority_muscles) if priority_muscles else 'ninguno'}.
10. RESPETA la intensidad preferida: {intensity_rir}.
11. Considera las condiciones medicas: {', '.join(medical_conditions) if medical_conditions else 'ninguna'}. Si hay condiciones, evita o modifica ejercicios contraindicados.
12. El entrenamiento debe distribuirse en {days_per_week} dias por semana con sesiones de aproximadamente {session_minutes} minutos cada una.
13. Ajusta la complejidad de los ejercicios segun el nivel de experiencia ({profile.experience_level}).

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


def generate_json_with_gemini(prompt, *, temperature=0.3, max_output_tokens=8192):
    """Runs an arbitrary prompt expecting a JSON object back (used by the AI coach).

    Same configuration and error mapping as ``generate_routine_with_gemini``;
    kept separate so the routine-generation path stays untouched.
    """
    if not settings.GEMINI_API_KEY:
        raise GeminiConfigurationError()

    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise GeminiConfigurationError("Gemini package is not installed.") from exc

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
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


def extract_json_payload(raw_response):
    """Tolerantly extracts the JSON object from a raw Gemini text response."""
    if not isinstance(raw_response, str) or not raw_response.strip():
        raise GeminiResponseError("Gemini returned an empty response.")

    raw = raw_response.strip()
    if raw.startswith("`"):
        raw = raw.removeprefix("`").strip()
        if raw.startswith("json"):
            raw = raw.removeprefix("json").strip()
        if raw.endswith("`"):
            raw = raw.removesuffix("`").strip()

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise GeminiResponseError("Gemini response does not contain a JSON object.")

    try:
        return json.loads(raw[start : end + 1])
    except json.JSONDecodeError as exc:
        if "Unterminated string" in str(exc) or end == len(raw) - 1:
            raise GeminiResponseError(
                "Gemini response was truncated before valid JSON completed."
            ) from exc
        raise GeminiResponseError("Gemini response is not valid JSON.") from exc


def parse_gemini_routine_response(raw_response):
    if isinstance(raw_response, dict):
        return validate_routine_payload(raw_response)

    payload = extract_json_payload(raw_response)

    try:
        return validate_routine_payload(payload)
    except ValidationError as exc:
        raise GeminiResponseError(exc.detail) from exc
