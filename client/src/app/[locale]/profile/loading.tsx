export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-zinc-800/60" />
      <div className="h-48 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-48 animate-pulse rounded-[2rem] bg-zinc-800/60" />
      <div className="h-24 animate-pulse rounded-[2rem] bg-zinc-800/60" />
    </div>
  );
}
