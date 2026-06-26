export default function RoutineDayLoading() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="h-8 w-32 animate-pulse rounded-xl bg-zinc-800/60" />
      <div className="h-48 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-64 animate-pulse rounded-[2rem] bg-zinc-800/60" />
    </div>
  );
}
