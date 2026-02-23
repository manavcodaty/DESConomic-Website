import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function UIInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] transition focus:ring-2",
        className
      )}
      {...props}
    />
  );
}
