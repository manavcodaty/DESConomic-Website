import { cn } from "@/lib/utils";

export function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "neutral" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        variant === "accent"
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--line)] bg-white text-[var(--muted)]"
      )}
    >
      {children}
    </span>
  );
}
