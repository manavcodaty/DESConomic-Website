"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SiteHeader() {
  const topics = useQuery(api.topics.listTopics, {}) ?? [];

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="editorial-container flex items-center justify-between py-4">
        <Link className="font-[family-name:var(--font-headline)] text-2xl font-semibold tracking-tight" href="/">
          DESConomic Review
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link className="headline-link" href="/">
            Home
          </Link>
          <details className="group relative">
            <summary className="headline-link cursor-pointer list-none">Topics</summary>
            <div className="absolute right-0 top-7 z-20 min-w-44 rounded-md border border-[var(--line)] bg-white p-2 shadow-lg">
              {topics.map((topic: any) => (
                <Link key={topic._id} className="block rounded px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)]" href={`/?topic=${topic.slug}`}>
                  {topic.name}
                </Link>
              ))}
            </div>
          </details>
          <Link className="headline-link" href="/upload">
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}
