"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { AuthDivider } from "./AuthDivider";
import { AuthField } from "./AuthField";
import { GoogleOAuthButton } from "./GoogleOAuthButton";

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth.register");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMismatch(false);

    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }

    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message || t("error"));
      return;
    }

    if (data.session) {
      // New users land on the dashboard, which points them at /routine to pick
      // a routine (build manually / generate with AI) when there is none.
      router.push(`/${locale}/dashboard`);
      router.refresh();
      return;
    }

    setNeedsConfirmation(true);
  }

  if (needsConfirmation) {
    return (
      <>
        <div role="status" className="flex flex-col items-start gap-5 border-t border-white/[0.13] pt-7">
          <span className="grid size-16 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/[0.12] text-[#a6ff00]">
            <CheckCircle2 aria-hidden="true" size={32} strokeWidth={1.6} />
          </span>
          <p className="text-[22px] font-extrabold leading-snug">{t("success")}</p>
        </div>
        <Link
          href={`/${locale}/auth/login`}
          className="apex-button flex h-[60px] items-center justify-center rounded-[1.875rem] text-lg font-extrabold"
        >
          {t("successCta")} <span aria-hidden="true">→</span>
        </Link>
      </>
    );
  }

  const revealLabels = { show: t("showPassword"), hide: t("hidePassword") };

  return (
    <>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <AuthField
            id="email"
            label={t("email")}
            icon={Mail}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            disabled={isLoading}
          />
          <AuthField
            id="password"
            label={t("password")}
            icon={Lock}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            minLength={6}
            disabled={isLoading}
            revealLabels={revealLabels}
          />
          <AuthField
            id="confirm-password"
            label={t("confirmPassword")}
            icon={Lock}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder={t("confirmPasswordPlaceholder")}
            autoComplete="new-password"
            minLength={6}
            disabled={isLoading}
            error={mismatch ? t("passwordMismatch") : null}
            revealLabels={revealLabels}
          />
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-red-300">
            <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="apex-button flex h-[60px] items-center justify-center gap-3 rounded-[1.875rem] text-lg font-extrabold disabled:opacity-85"
        >
          {isLoading ? (
            <>
              <Loader2 aria-hidden="true" size={22} strokeWidth={2.4} className="animate-spin" />
              {t("loading")}
            </>
          ) : (
            <>
              {t("submit")} <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>

      <AuthDivider label={t("or")} />

      <GoogleOAuthButton
        locale={locale}
        intent="register"
        label={t("google")}
        loadingLabel={t("googleLoading")}
        errorLabel={t("googleError")}
        disabled={isLoading}
      />

      <Link
        href={`/${locale}/auth/login`}
        className="flex min-h-12 items-center justify-center text-[17px] font-bold text-[#a6ff00]"
      >
        {t("loginLink")}
      </Link>
    </>
  );
}
