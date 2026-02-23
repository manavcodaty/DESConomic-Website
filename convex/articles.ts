import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCurrentUserRecord, requireAdmin } from "./lib/auth";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(ctx: any, slug: string, articleId?: string) {
  const existing = await ctx.db
    .query("articles")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== articleId) {
    throw new ConvexError("Slug already exists");
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserRecord(ctx);
    return await ctx.storage.generateUploadUrl();
  }
});

export const createArticleDraft = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    topicId: v.id("topics"),
    tags: v.optional(v.array(v.string())),
    coverImageStorageId: v.optional(v.id("_storage")),
    excerpt: v.optional(v.string()),
    body: v.optional(v.any()),
    slug: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { identity, user } = await getCurrentUserRecord(ctx);
    const now = Date.now();
    const slug = createSlug(args.slug ?? args.title);
    await ensureUniqueSlug(ctx, slug);

    return await ctx.db.insert("articles", {
      title: args.title,
      subtitle: args.subtitle,
      slug,
      excerpt: args.excerpt ?? args.title,
      body: args.body ?? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] },
      coverImageStorageId: args.coverImageStorageId,
      inlineImageStorageIds: [],
      authorClerkUserId: identity.subject,
      authorName: user.name,
      topicId: args.topicId,
      tags: args.tags ?? [],
      status: "draft",
      featured: false,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const updateArticleDraft = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    topicId: v.optional(v.id("topics")),
    tags: v.optional(v.array(v.string())),
    coverImageStorageId: v.optional(v.id("_storage")),
    excerpt: v.optional(v.string()),
    body: v.optional(v.any()),
    slug: v.optional(v.string()),
    featured: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { identity } = await getCurrentUserRecord(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");

    const isOwner = article.authorClerkUserId === identity.subject;
    if (!isOwner) {
      await requireAdmin(ctx);
    }

    if (isOwner && article.status === "submitted") {
      throw new ConvexError("Submitted articles are locked until admin action.");
    }

    if (args.slug) {
      await ensureUniqueSlug(ctx, createSlug(args.slug), args.articleId);
    }

    await ctx.db.patch(args.articleId, {
      title: args.title ?? article.title,
      subtitle: args.subtitle,
      topicId: args.topicId ?? article.topicId,
      tags: args.tags ?? article.tags,
      coverImageStorageId: args.coverImageStorageId,
      excerpt: args.excerpt ?? article.excerpt,
      body: args.body ?? article.body,
      slug: args.slug ? createSlug(args.slug) : article.slug,
      featured: args.featured ?? article.featured,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const uploadArticleImage = mutation({
  args: {
    articleId: v.optional(v.id("articles")),
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    await getCurrentUserRecord(ctx);

    const url = await ctx.storage.getUrl(args.storageId);

    if (args.articleId) {
      const article = await ctx.db.get(args.articleId);
      if (article) {
        await ctx.db.patch(args.articleId, {
          inlineImageStorageIds: [...(article.inlineImageStorageIds ?? []), args.storageId],
          updatedAt: Date.now()
        });
      }
    }

    return {
      storageId: args.storageId,
      url
    };
  }
});

export const submitArticle = mutation({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    const { identity } = await getCurrentUserRecord(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");

    if (article.authorClerkUserId !== identity.subject) {
      throw new ConvexError("You can only submit your own articles");
    }

    if (article.status !== "draft" && article.status !== "rejected") {
      throw new ConvexError("Only draft or rejected articles can be submitted");
    }

    await ctx.db.patch(args.articleId, {
      status: "submitted",
      rejectionReason: undefined,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const withdrawSubmission = mutation({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    const { identity } = await getCurrentUserRecord(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");
    if (article.authorClerkUserId !== identity.subject) throw new ConvexError("Forbidden");
    if (article.status !== "submitted") throw new ConvexError("Only submitted articles can be withdrawn");

    await ctx.db.patch(args.articleId, {
      status: "draft",
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const listMyArticles = query({
  args: {},
  handler: async (ctx) => {
    const { identity } = await getCurrentUserRecord(ctx);
    const articles = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("authorClerkUserId"), identity.subject))
      .collect();

    return articles.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const listSubmittedArticles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    return articles.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const listAdminArticles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const articles = await ctx.db.query("articles").collect();
    return articles.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const approveArticle = mutation({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");

    await ctx.db.patch(args.articleId, {
      status: "approved",
      rejectionReason: undefined,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const rejectArticle = mutation({
  args: {
    articleId: v.id("articles"),
    reason: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");

    await ctx.db.patch(args.articleId, {
      status: "rejected",
      rejectionReason: args.reason,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const publishArticle = mutation({
  args: {
    articleId: v.id("articles"),
    mode: v.union(v.literal("now"), v.literal("schedule")),
    publishAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new ConvexError("Article not found");

    if (article.status !== "approved" && article.status !== "scheduled") {
      throw new ConvexError("Only approved articles can be published");
    }

    if (args.mode === "schedule") {
      if (!args.publishAt) {
        throw new ConvexError("publishAt is required for scheduled publish");
      }

      await ctx.db.patch(args.articleId, {
        status: "scheduled",
        publishAt: args.publishAt,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.patch(args.articleId, {
        status: "published",
        publishAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return await ctx.db.get(args.articleId);
  }
});

export const runScheduledPublish = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const scheduled = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    let published = 0;
    for (const article of scheduled) {
      if ((article.publishAt ?? 0) <= now) {
        await ctx.db.patch(article._id, {
          status: "published",
          updatedAt: now
        });
        published += 1;
      }
    }

    return { published };
  }
});

export const setFeatured = mutation({
  args: {
    articleId: v.id("articles"),
    featured: v.boolean()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.articleId, {
      featured: args.featured,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.articleId);
  }
});

export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.articleId);
    return { ok: true };
  }
});

export const listPublishedArticles = query({
  args: {
    topicSlug: v.optional(v.string()),
    search: v.optional(v.string()),
    sort: v.optional(v.union(v.literal("latest"), v.literal("popular")))
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const topics = await ctx.db.query("topics").collect();
    const topicMap = new Map(topics.map((topic) => [topic._id, topic]));

    const filtered = articles
      .filter((article) => (article.publishAt ?? now) <= now)
      .filter((article) => {
        if (!args.topicSlug) return true;
        const topic = topicMap.get(article.topicId);
        return topic?.slug === args.topicSlug;
      })
      .filter((article) => {
        if (!args.search) return true;
        const target = `${article.title} ${article.excerpt} ${JSON.stringify(article.body)} ${article.authorName}`.toLowerCase();
        return target.includes(args.search.toLowerCase());
      })
      .map((article) => ({ article, topic: topicMap.get(article.topicId) ?? null }));

    const withImages = await Promise.all(
      filtered.map(async ({ article, topic }) => ({
        ...article,
        topic,
        coverImageUrl: article.coverImageStorageId ? await ctx.storage.getUrl(article.coverImageStorageId) : null
      }))
    );

    const sorted = withImages.sort((a, b) => {
      if (args.sort === "popular") {
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        if (af !== bf) return bf - af;
      }
      return (b.publishAt ?? b.createdAt) - (a.publishAt ?? a.createdAt);
    });

    return sorted;
  }
});

export const getArticleBySlug = query({
  args: {
    slug: v.string()
  },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!article || article.status !== "published") {
      return null;
    }

    const topic = await ctx.db.get(article.topicId);
    let coverImageUrl: string | null = null;
    if (article.coverImageStorageId) {
      coverImageUrl = await ctx.storage.getUrl(article.coverImageStorageId);
    }

    return {
      ...article,
      topic,
      coverImageUrl
    };
  }
});

export const getArticleById = query({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    const { user, identity } = await getCurrentUserRecord(ctx);
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;
    if (user.role === "writer" && article.authorClerkUserId !== identity.subject) return null;

    const coverImageUrl = article.coverImageStorageId ? await ctx.storage.getUrl(article.coverImageStorageId) : null;

    return {
      ...article,
      coverImageUrl
    };
  }
});

export const listRelatedArticles = query({
  args: {
    topicId: v.id("topics"),
    excludeArticleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_topicId", (q) => q.eq("topicId", args.topicId))
      .collect();

    return articles
      .filter((article) => article._id !== args.excludeArticleId && article.status === "published")
      .sort((a, b) => (b.publishAt ?? b.createdAt) - (a.publishAt ?? a.createdAt))
      .slice(0, 4);
  }
});
