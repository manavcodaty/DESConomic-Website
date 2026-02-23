import Link from "next/link";

export default function NotFound() {
  return (
    <main className="editorial-container py-16">
      <h1 className="font-[family-name:var(--font-headline)] text-4xl">Page not found</h1>
      <p className="mt-2 text-[var(--muted)]">The requested resource is unavailable.</p>
      <Link className="headline-link mt-6 inline-block" href="/">
        Return to home
      </Link>
    </main>
  );
}
