"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  locale: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    loading: string;
    error: string;
  };
};

export function LoginForm({ locale, labels }: LoginFormProps) {
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
      setError(authError.message || labels.error);
      return;
    }

    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-3 text-xs font-black uppercase tracking-[0.22em] text-white/65">
        {labels.email}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@email.com"
          className="apex-input rounded-2xl px-4 py-4 text-base normal-case tracking-normal placeholder:text-white/35"
        />
      </label>

      <label className="flex flex-col gap-3 text-xs font-black uppercase tracking-[0.22em] text-white/65">
        {labels.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••••"
          className="apex-input rounded-2xl px-4 py-4 text-base normal-case tracking-normal placeholder:text-white/35"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="apex-button mt-2 rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? labels.loading : labels.submit}
      </button>
    </form>
  );
}
