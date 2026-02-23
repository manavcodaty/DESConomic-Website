import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TiptapRenderer } from "@/lib/tiptap-renderer";
import { Badge } from "@/components/badge";
import { formatDate, readingTimeFromJson } from "@/lib/utils";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await fetchQuery(api.articles.getArticleBySlug, {
    slug
  });

  if (!article) {
    notFound();
  }

  const related = await fetchQuery(api.articles.listRelatedArticles, {
    topicId: article.topicId,
    excludeArticleId: article._id
  });

  return (
    <main className="editorial-container py-10">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-[var(--line)] pb-8">
          <Badge variant="accent">{article.topic?.name ?? "Topic"}</Badge>
          <h1 className="mt-3 font-[family-name:var(--font-headline)] text-4xl leading-tight md:text-5xl">{article.title}</h1>
          {article.subtitle ? <p className="mt-3 text-xl text-[var(--muted)]">{article.subtitle}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
            <span>{article.authorName}</span>
            <span>{formatDate(article.publishAt ?? article.createdAt)}</span>
            <span>{readingTimeFromJson(article.body)} min read</span>
          </div>
        </header>

        {article.coverImageUrl ? (
          <div className="mt-8 overflow-hidden rounded-lg border border-[var(--line)]">
            <Image
              alt={article.title}
              className="h-auto w-full object-cover"
              height={900}
              priority
              src={article.coverImageUrl}
              width={1600}
            />
          </div>
        ) : null}

        <section className="mt-10">
          <TiptapRenderer doc={article.body} />
        </section>

        <section className="mt-12 border-t border-[var(--line)] pt-8">
          <h2 className="font-[family-name:var(--font-headline)] text-2xl">Related articles</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {related.map((item: any) => (
              <Link key={item._id} className="card-lift rounded-md border border-[var(--line)] p-4" href={`/article/${item.slug}`}>
                <p className="kicker">{item.authorName}</p>
                <h3 className="headline-link mt-2 font-[family-name:var(--font-headline)] text-xl">{item.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
