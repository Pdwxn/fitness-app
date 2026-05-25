import json

from django.conf import settings
from rest_framework.exceptions import APIException


FITNESS_KNOWLEDGE_BASE = """
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

## BANCO DE EJERCICIOS POR GRUPO MUSCULAR

CUADRICEPS: Sentadilla trasera, Sentadilla frontal, Sentadilla pistol,
  Sentadilla bulgara, Zancadas, Hack squat, Prensa, Extension de rodilla

GLUTEOS: Hip thrust, Glute bridge, Patada de gluteo, Peso muerto,
  Sentadilla bulgara, Kettlebell swing, Buenos dias, Hiperextension de cadera,
  Abducciones en maquina/polea

FEMORALES: Peso muerto convencional, Peso muerto rumano, Peso muerto sumo,
  Curl de femoral, Glute ham raise, Buenos dias

DORSAL: Remo con barra/mancuernas, Dominadas, Jalon al pecho, Pullover en polea

PECTORAL: Press de banca, Flexiones, Aperturas con mancuernas

DELTOIDES: Press militar, Elevaciones laterales, Elevaciones frontales, Remo al menton

BICEPS: Curl con mancuernas/barra, Curl martillo, Curl en banco predicador,
  Dominadas supinas

TRICEPS: Extension en polea, Press frances, Skull crusher, Fondos en paralelas

GEMELOS: Flexo-extension de tobillo (de pie y sentado), Estiramientos para dorsiflexion

ABDOMINALES - Recto: Crunch y variantes de flexo-extension de tronco
ABDOMINALES - Transverso: Planchas y variantes isometricas

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

    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = build_routine_prompt(user, previous_month_notes=previous_month_notes)
    response = model.generate_content(prompt)
    return response.text
