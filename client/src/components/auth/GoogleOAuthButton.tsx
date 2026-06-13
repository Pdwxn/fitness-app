"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleOAuthButtonProps = {
  locale: string;
  intent?: "login" | "register";
  label: string;
  loadingLabel: string;
  errorLabel: string;
};

export function GoogleOAuthButton({
  locale,
  intent = "login",
  label,
  loadingLabel,
  errorLabel,
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
    <div className="mt-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="rounded-2xl border border-white/20 bg-white/[0.03] px-5 py-4 text-sm font-black text-white transition hover:border-[#a6ff00]/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? loadingLabel : `G  ${label}`}
      </button>
      {error ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
