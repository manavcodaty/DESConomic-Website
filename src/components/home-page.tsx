"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UIInput } from "@/components/ui-input";
import { Badge } from "@/components/badge";
import { SubscribeModule } from "@/components/subscribe-module";
import { formatDate, readingTimeFromJson } from "@/lib/utils";

type SortMode = "latest" | "popular";

const placeholderCover = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80";

export function HomePage() {
  const topics = (useQuery(api.topics.listTopics, {}) ?? []) as any[];
  const [search, setSearch] = useState("");
  const [topicSlug, setTopicSlug] = useState<string>("");
  const [sort, setSort] = useState<SortMode>("latest");

  const articles = useQuery(api.articles.listPublishedArticles, {
    search: search || undefined,
    topicSlug: topicSlug || undefined,
    sort
  }) as any[] | undefined;

  const content = useMemo(() => {
    const list = articles ?? [];
    return {
      hero: list[0] ?? null,
      topStories: list.slice(1, 5),
      latest: list.slice(0, 12)
    };
  }, [articles]);

  const topicSections = useMemo(() => {
    if (!articles) return [];

    return topics
      .map((topic: any) => ({
        topic,
        entries: articles.filter((article: any) => article.topic?._id === topic._id).slice(0, 3)
      }))
      .filter((section: any) => section.entries.length > 0);
  }, [articles, topics]);

  return (
    <main className="editorial-container py-8">
      <section className="grid gap-4 border-b border-[var(--line)] pb-8 md:grid-cols-[2fr_1fr] md:gap-8">
        <div>
          <p className="kicker">DESConomic Review</p>
          <h1 className="mt-2 max-w-3xl font-[family-name:var(--font-headline)] text-5xl leading-none md:text-7xl">
            Student economics reporting, opinion, and analysis.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
            A premium editorial digest built by students on markets, policy, business, and technology.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-headline)] text-2xl">Search and filter</h2>
          <div className="mt-4 space-y-3">
            <UIInput
              aria-label="Search articles"
              placeholder="Search by title, body, author..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter by topic"
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
              value={topicSlug}
              onChange={(event) => setTopicSlug(event.target.value)}
            >
              <option value="">All topics</option>
              {topics.map((topic: any) => (
                <option key={topic._id} value={topic.slug}>
                  {topic.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort articles"
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
            >
              <option value="latest">Latest</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>
      </section>

      {content.hero ? (
        <section className="mt-10 grid gap-8 border-b border-[var(--line)] pb-10 lg:grid-cols-[2fr_1fr]">
          <article className="card-lift rounded-md bg-white">
            <Link href={`/article/${content.hero.slug}`}>
              <div className="overflow-hidden rounded-md border border-[var(--line)]">
                <Image
                  alt={content.hero.title}
                  className="h-[360px] w-full object-cover"
                  height={720}
                  priority
                  src={content.hero.coverImageUrl ?? placeholderCover}
                  width={1280}
                />
              </div>
              <div className="mt-4">
                <p className="kicker">Lead Story</p>
                <h2 className="headline-link mt-2 font-[family-name:var(--font-headline)] text-4xl leading-tight">
                  {content.hero.title}
                </h2>
                <p className="mt-3 text-[var(--muted)]">{content.hero.excerpt}</p>
              </div>
            </Link>
          </article>

          <div className="space-y-4">
            {content.topStories.map((article: any) => (
              <Link key={article._id} className="card-lift block rounded-md border border-[var(--line)] bg-white p-4" href={`/article/${article.slug}`}>
                <Badge>{article.topic?.name ?? "Topic"}</Badge>
                <h3 className="headline-link mt-3 font-[family-name:var(--font-headline)] text-xl leading-tight">{article.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{article.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-[family-name:var(--font-headline)] text-3xl">Latest</h2>
          <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {(content.latest ?? []).map((article: any) => (
              <article key={article._id} className="card-lift py-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <span>{article.authorName}</span>
                  <span>{formatDate(article.publishAt ?? article.createdAt)}</span>
                  <span>{readingTimeFromJson(article.body)} min read</span>
                  <Badge>{article.topic?.name ?? "Topic"}</Badge>
                </div>
                <Link className="headline-link mt-2 block font-[family-name:var(--font-headline)] text-2xl" href={`/article/${article.slug}`}>
                  {article.title}
                </Link>
                <p className="mt-2 max-w-3xl text-[var(--muted)]">{article.excerpt}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <SubscribeModule />
          <div className="rounded-xl border border-[var(--line)] bg-white p-6">
            <h3 className="font-[family-name:var(--font-headline)] text-2xl">Topics</h3>
            <div className="mt-4 space-y-5">
              {topicSections.map((section: any) => (
                <div key={section.topic._id}>
                  <p className="kicker">{section.topic.name}</p>
                  <div className="mt-2 space-y-2">
                    {section.entries.map((entry: any) => (
                      <Link key={entry._id} className="headline-link block text-sm" href={`/article/${entry.slug}`}>
                        {entry.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
