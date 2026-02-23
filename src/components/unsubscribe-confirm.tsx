"use client";

import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { UIButton } from "@/components/ui-button";

export function UnsubscribeConfirm({ token }: { token: string }) {
  const unsubscribe = useMutation(api.subscribers.unsubscribe);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-[var(--line)] bg-white p-8">
      <h1 className="font-[family-name:var(--font-headline)] text-3xl">Unsubscribe</h1>
      <p className="mt-3 text-[var(--muted)]">Confirm to stop receiving monthly DESConomic Review emails.</p>

      <UIButton
        className="mt-6"
        onClick={async () => {
          try {
            await unsubscribe({ token });
            setStatus("done");
          } catch {
            setStatus("error");
          }
        }}
      >
        Confirm unsubscribe
      </UIButton>

      {status === "done" ? <p className="mt-3 text-green-700">You have been unsubscribed.</p> : null}
      {status === "error" ? <p className="mt-3 text-red-700">Invalid or expired token.</p> : null}
    </div>
  );
}
