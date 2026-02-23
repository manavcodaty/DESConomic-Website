import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function UIButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
