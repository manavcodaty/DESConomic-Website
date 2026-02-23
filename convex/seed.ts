import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

const TOPIC_DEFAULTS = ["Markets", "Policy", "Business", "Tech", "Opinion", "School Economy"];

const sampleBodies = [
  "Inflation prints cooled this quarter, but wage pressure remains uneven across sectors.",
  "Central bank policy guidance is shifting from tightening to measured normalization.",
  "The tech cycle is increasingly tied to AI capex and energy market constraints.",
  "Students are watching FX rates as tuition and travel expectations reprice annually.",
  "Supply chain stabilization reduced costs, but geopolitical risk remains elevated."
];

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db.query("topics").collect();
    const now = Date.now();

    let topicIds = topics.map((t) => t._id);

    if (topics.length === 0) {
      for (const name of TOPIC_DEFAULTS) {
        const id = await ctx.db.insert("topics", {
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          createdAt: now,
          updatedAt: now
        });
        topicIds.push(id);
      }
    }

    const existingArticles = await ctx.db.query("articles").take(1);
    if (existingArticles.length === 0 && topicIds.length > 0) {
      for (let i = 0; i < 10; i += 1) {
        const title = `Demo Analysis ${i + 1}: Regional Growth Outlook`;
        const slug = `demo-analysis-${i + 1}`;
        const body = {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] },
            {
              type: "paragraph",
              content: [{ type: "text", text: sampleBodies[i % sampleBodies.length] }]
            },
            {
              type: "blockquote",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Markets discount narratives faster than institutions adjust strategy." }] }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "This is seeded placeholder content for local development." }]
            }
          ]
        };

        await ctx.db.insert("articles", {
          title,
          subtitle: "Seeded article",
          slug,
          excerpt: "Seeded editorial content for DESConomic Review.",
          body,
          authorClerkUserId: "seed-author",
          authorName: "DESConomic Desk",
          topicId: topicIds[i % topicIds.length],
          tags: ["seed", "demo"],
          status: "published",
          featured: i === 0,
          publishAt: now - i * 86400000,
          createdAt: now - i * 86400000,
          updatedAt: now - i * 86400000
        });
      }
    }

    const subscribers = await ctx.db.query("subscribers").take(1);
    if (subscribers.length === 0) {
      await ctx.db.insert("subscribers", {
        email: "reader.demo@example.com",
        status: "active",
        subscribedAt: now,
        unsubscribeToken: crypto.randomUUID().replace(/-/g, "")
      });
    }

    return {
      ok: true
    };
  }
});

export const getMonthlyReviewCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db.query("monthlyReviews").collect();
    return reviews.length;
  }
});

export const insertSeedMonthlyReview = internalMutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("monthlyReviews", {
      monthLabel: "February 2026",
      pdfStorageId: args.storageId,
      createdAt: now,
      createdByClerkUserId: "seed-admin",
      sendStatus: "not_sent",
      secureToken: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
    });

    return { ok: true };
  }
});

export const runWithPlaceholderPdf = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.seed.run, {});

    const monthlyCount = await ctx.runQuery(internal.seed.getMonthlyReviewCount, {});
    if (monthlyCount === 0) {
      const placeholderBlob = new Blob(["DESConomic placeholder PDF"], { type: "application/pdf" });
      const storageId = await ctx.storage.store(placeholderBlob);
      await ctx.runMutation(internal.seed.insertSeedMonthlyReview, {
        storageId
      });
    }

    return {
      ok: true
    };
  }
});
