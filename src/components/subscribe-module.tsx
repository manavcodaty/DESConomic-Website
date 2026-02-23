"use client";

import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { UIInput } from "@/components/ui-input";
import { UIButton } from "@/components/ui-button";

export function SubscribeModule() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const subscribe = useMutation(api.subscribers.subscribe);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await subscribe({ email });
      setMessage(result.duplicate ? "You are already subscribed." : "Subscribed. Watch your inbox for monthly updates.");
      if (!result.duplicate) {
        setEmail("");
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-6">
      <p className="kicker">Newsletter</p>
      <h3 className="mt-2 font-[family-name:var(--font-headline)] text-2xl">Get the monthly DESConomic Review</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">Receive a secure PDF link and unsubscribe anytime.</p>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <UIInput
          required
          aria-label="Email address"
          placeholder="you@school.edu"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <UIButton disabled={isSubmitting} type="submit">
          {isSubmitting ? "Subscribing..." : "Subscribe"}
        </UIButton>
      </form>
      {message ? <p className="mt-2 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
