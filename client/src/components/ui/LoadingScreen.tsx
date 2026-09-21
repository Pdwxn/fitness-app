import { getTranslations } from "next-intl/server";

import { PageSkeleton } from "./Skeleton";

/** What a route shows while its page loads: the app frame's spacing with skeleton content. */
export async function LoadingScreen({ rows = 4, hero = false }: { rows?: number; hero?: boolean }) {
  const t = await getTranslations("States");

  return (
    <div className="apex-bg min-h-screen pb-28 text-white md:pb-0 md:pl-64">
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8 md:max-w-3xl md:px-10 lg:max-w-5xl">
        <PageSkeleton label={t("loading")} rows={rows} hero={hero} />
      </main>
    </div>
  );
}
