export default function ProgressLoading() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="h-24 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-20 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-64 animate-pulse rounded-[2rem] bg-zinc-800/60" />
    </div>
  );
}
