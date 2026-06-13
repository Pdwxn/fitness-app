import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.login");

  return (
    <main className="apex-bg relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center overflow-hidden px-5 py-8 text-white md:max-w-2xl">
      <div className="pointer-events-none absolute right-0 top-10 h-72 w-56 rounded-full bg-[#a6ff00]/20 blur-3xl" />
      <section className="apex-card relative rounded-[2rem] p-6 shadow-sm md:p-8">
        <p className="apex-logo text-2xl"><span>APEX</span> <span className="apex-lime">FIT</span></p>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.32em] text-[#a6ff00]">AI FITNESS APP</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-md text-lg leading-8 text-white/65">{t("description")}</p>

        <LoginForm
          locale={locale}
          labels={{
            email: t("email"),
            password: t("password"),
            submit: t("submit"),
            loading: t("loading"),
            error: t("error"),
          }}
        />

        <GoogleOAuthButton
          locale={locale}
          intent="login"
          label={t("google")}
          loadingLabel={t("googleLoading")}
          errorLabel={t("googleError")}
        />

        <Link
          href={`/${locale}/auth/register`}
          className="mt-4 block rounded-2xl border border-[#a6ff00]/55 bg-transparent px-5 py-4 text-center text-sm font-black text-white transition hover:bg-[#a6ff00] hover:text-black"
        >
          {t("registerLink")}
        </Link>
      </section>
    </main>
  );
}
