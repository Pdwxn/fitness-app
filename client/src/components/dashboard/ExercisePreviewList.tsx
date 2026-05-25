import type { RoutineDay } from "@/types/routine";

type ExercisePreviewListProps = {
  day: RoutineDay | null;
  labels: {
    title: string;
    restDay: string;
    sets: string;
    reps: string;
    rest: string;
    weight: string;
    seconds: string;
    empty: string;
  };
};

export function ExercisePreviewList({ day, labels }: ExercisePreviewListProps) {
  if (!day) {
    return (
      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <h3 className="text-xl font-black tracking-tight">{labels.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#5c5349]">{labels.empty}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e34]">
            {labels.title}
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">{day.day_name}</h3>
        </div>
        <span className="rounded-full bg-[#f7f3ec] px-3 py-1 text-xs font-black text-[#5c5349]">
          {day.is_rest_day ? labels.restDay : `${day.exercises.length} ${labels.title.toLowerCase()}`}
        </span>
      </div>

      {day.is_rest_day ? (
        <p className="mt-5 rounded-3xl bg-[#f7f3ec] p-4 text-sm font-semibold text-[#5c5349]">
          {labels.restDay}
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          {day.exercises.slice(0, 6).map((exercise) => (
            <article key={exercise.id} className="rounded-3xl bg-[#f7f3ec] p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-black tracking-tight">{exercise.name}</h4>
                  <p className="text-sm font-semibold text-[#8b5e34]">{exercise.muscle_group}</p>
                </div>
                <p className="text-sm font-black text-[#17130f]">
                  {exercise.sets ?? "-"} {labels.sets} x {exercise.reps || `- ${labels.reps}`}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#5c5349]">
                {exercise.rest_seconds ? (
                  <span className="rounded-full bg-white px-3 py-1">
                    {labels.rest}: {exercise.rest_seconds} {labels.seconds}
                  </span>
                ) : null}
                {exercise.weight_kg ? (
                  <span className="rounded-full bg-white px-3 py-1">
                    {labels.weight}: {exercise.weight_kg} kg
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
