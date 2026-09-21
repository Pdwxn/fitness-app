"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleOAuthButtonProps = {
  locale: string;
  intent?: "login" | "register";
  label: string;
  loadingLabel: string;
  errorLabel: string;
  disabled?: boolean;
};

export function GoogleOAuthButton({
  locale,
  intent = "login",
  label,
  loadingLabel,
  errorLabel,
  disabled = false,
}: GoogleOAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?intent=${intent}`,
      },
    });

    if (authError) {
      setError(authError.message || errorLabel);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || disabled}
        className="flex h-[58px] w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-white/30 text-[17px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full border-[1.5px] border-white/40 text-[15px] font-extrabold"
        >
          G
        </span>
        {isLoading ? loadingLabel : label}
      </button>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-red-300">
          <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
