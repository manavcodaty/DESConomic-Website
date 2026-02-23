import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] py-10 text-sm text-[var(--muted)]">
      <div className="editorial-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>DESConomic Review. Student publication for economics commentary and analysis.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/about">About</Link>
          <span>Privacy: subscriber emails are only used for monthly review updates.</span>
          <span>Unsubscribe via link in each email.</span>
        </div>
      </div>
    </footer>
  );
}
