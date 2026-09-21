import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/states";

export default async function NotFound() {
  const t = await getTranslations("States");

  return (
    <main className="apex-bg flex min-h-screen items-center px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <EmptyState
          icon={SearchX}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={
            <Link
              href="/"
              className="apex-button flex h-14 items-center justify-center rounded-[28px] px-8 text-lg font-extrabold"
            >
              {t("goHome")}
            </Link>
          }
        />
      </div>
    </main>
  );
}
