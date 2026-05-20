import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function RegisterPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.register");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-[#f7f3ec] px-5 py-8 text-[#17130f]">
      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b5e34]">
          FIT AI
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-base leading-7 text-[#5c5349]">{t("description")}</p>

        <div className="mt-8 rounded-2xl bg-[#17130f] p-4 text-sm text-[#f7f3ec]">
          {t("placeholder")}
        </div>

        <Link
          href={`/${locale}/auth/login`}
          className="mt-6 block rounded-full border border-[#17130f] px-5 py-3 text-center text-sm font-bold"
        >
          {t("loginLink")}
        </Link>
      </section>
    </main>
  );
}
