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
    <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        {labels.email}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="rounded-2xl border border-[#ded2bf] bg-white px-4 py-3 text-base outline-none transition focus:border-[#8b5e34]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold">
        {labels.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          className="rounded-2xl border border-[#ded2bf] bg-white px-4 py-3 text-base outline-none transition focus:border-[#8b5e34]"
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 rounded-full bg-[#17130f] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? labels.loading : labels.submit}
      </button>
    </form>
  );
}
