"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleOAuthButtonProps = {
  locale: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
};

export function GoogleOAuthButton({
  locale,
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
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
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
        className="rounded-full border border-[#ded2bf] bg-white px-5 py-3 text-sm font-bold text-[#17130f] transition hover:border-[#8b5e34] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? loadingLabel : label}
      </button>
      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
