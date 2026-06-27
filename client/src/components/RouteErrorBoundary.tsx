"use client";

export function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[RouteErrorBoundary]", error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold text-red-400">
          Algo salió mal
        </h2>
        <p className="mb-4 text-zinc-400">
          Ocurrió un error inesperado en esta página.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-[#a6ff00] px-4 py-2 text-black font-black"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
