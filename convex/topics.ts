import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/auth";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const listTopics = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("topics").collect();
  }
});

export const createTopic = mutation({
  args: {
    name: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = createSlug(args.name);
    const exists = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (exists) {
      throw new ConvexError("Topic already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("topics", {
      name: args.name,
      slug,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const updateTopic = mutation({
  args: {
    topicId: v.id("topics"),
    name: v.string()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const topic = await ctx.db.get(args.topicId);
    if (!topic) throw new ConvexError("Topic not found");

    const slug = createSlug(args.name);
    const slugConflict = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (slugConflict && slugConflict._id !== args.topicId) {
      throw new ConvexError("Another topic already uses this slug");
    }

    await ctx.db.patch(args.topicId, {
      name: args.name,
      slug,
      updatedAt: Date.now()
    });

    return await ctx.db.get(args.topicId);
  }
});

export const deleteTopic = mutation({
  args: {
    topicId: v.id("topics")
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const linkedArticles = await ctx.db
      .query("articles")
      .withIndex("by_topicId", (q) => q.eq("topicId", args.topicId))
      .take(1);

    if (linkedArticles.length > 0) {
      throw new ConvexError("Cannot delete a topic that still has articles. Reassign or delete articles first.");
    }

    await ctx.db.delete(args.topicId);
    return { ok: true };
  }
});
