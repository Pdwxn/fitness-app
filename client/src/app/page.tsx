import { getHealthCheck } from "@/lib/api";

async function loadBackendStatus() {
  try {
    return await getHealthCheck();
  } catch {
    return null;
  }
}

export default async function Home() {
  const backendStatus = await loadBackendStatus();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between bg-[#f7f3ec] px-5 py-8 text-[#17130f] md:max-w-3xl md:px-10 lg:max-w-5xl">
      <section className="flex flex-col gap-12">
        <nav className="flex items-center justify-between rounded-full border border-[#ded2bf] bg-white/70 px-4 py-3 shadow-sm">
          <span className="text-sm font-bold tracking-[0.2em]">FIT AI</span>
          <span className="rounded-full bg-[#17130f] px-3 py-1 text-xs font-medium text-white">
            Sprint 1
          </span>
        </nav>

        <div className="flex flex-col gap-5 md:max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b5e34]">
            Fitness AI App
          </p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            Base lista para construir el producto.
          </h1>
          <p className="text-lg leading-8 text-[#5c5349] md:text-xl">
            Monorepo inicial con Next.js 15, Tailwind CSS, Django REST y un
            healthcheck backend conectado desde el frontend.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-[#17130f] p-5 text-white shadow-xl">
            <p className="text-sm text-white/60">Frontend</p>
            <p className="mt-2 text-2xl font-bold">Next.js 15</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#ded2bf]">
            <p className="text-sm text-[#8b5e34]">Backend</p>
            <p className="mt-2 text-2xl font-bold">Django REST</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#ded2bf]">
            <p className="text-sm text-[#8b5e34]">API status</p>
            <p className="mt-2 text-2xl font-bold">
              {backendStatus ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-[#ded2bf] bg-white/80 p-5 shadow-sm">
        <p className="text-sm font-medium text-[#8b5e34]">Healthcheck</p>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#17130f] p-4 text-sm text-[#f7f3ec]">
          {JSON.stringify(backendStatus ?? { status: "unavailable" }, null, 2)}
        </pre>
      </section>
    </main>
  );
}
