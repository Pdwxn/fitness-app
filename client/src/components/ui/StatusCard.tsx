type StatusCardProps = {
  message: string;
  tone?: "neutral" | "warning" | "error";
};

const styles = {
  neutral: "border-white/10 bg-white/[0.06] text-white/65",
  warning: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  error: "border-red-400/30 bg-red-500/10 text-red-200",
};

export function StatusCard({ message, tone = "neutral" }: StatusCardProps) {
  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${styles[tone]}`}>
      <p className="text-sm font-bold">{message}</p>
    </section>
  );
}
