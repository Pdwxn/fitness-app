export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="h-32 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-24 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-48 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-20 animate-pulse rounded-[2rem] bg-zinc-800/60" />
    </div>
  );
}
