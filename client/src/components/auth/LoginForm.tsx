"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { AuthDivider } from "./AuthDivider";
import { AuthField } from "./AuthField";
import { GoogleOAuthButton } from "./GoogleOAuthButton";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message || t("error"));
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

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
            autoComplete="current-password"
            disabled={isLoading}
            error={error}
            revealLabels={{ show: t("showPassword"), hide: t("hidePassword") }}
          />
        </div>

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
        intent="login"
        label={t("google")}
        loadingLabel={t("googleLoading")}
        errorLabel={t("googleError")}
        disabled={isLoading}
      />

      <Link
        href={`/${locale}/auth/register`}
        className="flex min-h-12 items-center justify-center text-[17px] font-bold text-[#a6ff00]"
      >
        {t("registerLink")}
      </Link>
    </>
  );
}
