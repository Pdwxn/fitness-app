# Apex Fit

Apex Fit es una app web de entrenamiento (PWA) que te acompaña durante todo el mes: arma tu rutina, te guía en cada sesión, registra lo que levantás y la ajusta según tu progreso real.

Está pensada para **usarse**, no para replicarse: este README explica qué hace y cómo funciona por dentro, no cómo montarla.

## Qué hace

### Tu rutina, de dos maneras
- **Generada por IA.** Según tu perfil (objetivo, nivel, días disponibles, equipamiento), la app genera una rutina mensual.
- **Armada a mano.** Un builder te deja crear tu propia rutina: arrastrás los ejercicios para ordenarlos, partís de plantillas y podés repetir una semana completa en el resto del mes.
- Podés editar una rutina en cualquier momento sin perder lo que ya registraste.

### Un coach que propone, vos decidís
Cuando ya hay historial, la IA no regenera la rutina de cero: **propone cambios sobre la que ya tenés**. Cada propuesta pasa primero por un validador que descarta cambios incoherentes y recién después te llega para que la aceptes o la rechaces. Nada se aplica sin tu aprobación.

### Entrenar
- Vista del día con los ejercicios, su demostración (imagen o animación) y notas.
- Registro **serie por serie**: peso, repeticiones o tiempo.
- Días de descanso con su propio registro.
- Unidades de peso a elección (kg o lb).

### Progresión automática
Un motor de progresión sugiere cuánto subir en la próxima sesión según cómo te fue. Cada ejercicio puede usar una política distinta: por repeticiones, por tiempo, con techo de peso corporal o estilo GreySkull.

### Progreso
- Rachas y estadísticas del dashboard.
- Gráficos de volumen por semana.
- **Mapa muscular** con un cuerpo anatómico real (masculino o femenino según tu perfil) que colorea de amarillo a rojo cuánto trabajó cada uno de los 18 grupos musculares.

### Funciona sin conexión
Podés abrir tu rutina y registrar series sin internet. Lo que registrás se guarda en el dispositivo y se sincroniza solo cuando vuelve la conexión. Las imágenes y demos de los ejercicios también se guardan para uso offline.

### Y además
- Notificaciones push.
- Español e inglés.
- Se instala en el celular como una app y se adapta a pantallas de teléfono y de escritorio.

## Cómo funciona

```
┌────────────────────┐        ┌──────────────────────┐
│  Cliente (Next.js) │  API   │  Servidor (Django)   │
│  PWA, offline-first│ ─────► │  REST /api/v1/       │
└─────────┬──────────┘        └───────┬──────────────┘
          │                           │
   IndexedDB local             Base de datos + IA
   (rutina, logs, cola)        (rutinas, progreso, coach)
          │
   Supabase (autenticación)
```

- **Cliente (`client/`)**: Next.js con React. Guarda la rutina, los registros y una cola de cambios pendientes en el dispositivo (IndexedDB), así que la app responde al instante y no depende de la red. Cuando hay conexión, la cola se sincroniza con el servidor.
- **Servidor (`server/`)**: API REST en Django, dividida en módulos:
  - `users` y `profiles`: cuentas, perfil y onboarding.
  - `routines`: rutinas, catálogo de ejercicios, generación con IA y propuestas del coach.
  - `progress`: registros de entrenamiento y estadísticas.
  - `notifications`: suscripciones y envío de notificaciones push.
  - `health`: chequeo de estado del servicio.
- **Autenticación**: la maneja Supabase; el servidor valida cada petición con el token del usuario.
- **Catálogo de ejercicios**: se sincroniza de forma incremental. El cliente solo descarga lo que cambió y se entera de qué ejercicios se eliminaron.
- **IA**: genera las rutinas y las propuestas del coach, pero sus respuestas siempre se validan contra reglas del servidor (ejercicios existentes, estructura, límites) antes de guardarse o mostrarse.

## Estructura del repositorio

| Carpeta | Contenido |
| --- | --- |
| `client/` | Frontend: Next.js, interfaz, lógica offline y sincronización |
| `server/` | Backend: API Django, modelos, servicios de IA y progresión |
| `apex-fit-*-plan.md` | Documentos de diseño de cada módulo (backend, frontend, coach de IA, progresión, mapa muscular) |

## Créditos

La geometría del mapa muscular proviene de [MuscleMap](https://github.com/melihcolpan/MuscleMap) (licencia MIT). El detalle de atribución está en `client/src/components/progress/NOTICE_bodyData.md`.
