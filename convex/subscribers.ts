import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/auth";

function createToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const subscribe = mutation({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!validateEmail(email)) {
      throw new ConvexError("Invalid email");
    }

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing?.status === "active") {
      return { ok: true, duplicate: true };
    }

    if (existing && existing.status === "unsubscribed") {
      await ctx.db.patch(existing._id, {
        status: "active",
        subscribedAt: Date.now(),
        unsubscribedAt: undefined,
        unsubscribeToken: createToken()
      });
      return { ok: true, duplicate: false };
    }

    await ctx.db.insert("subscribers", {
      email,
      status: "active",
      subscribedAt: Date.now(),
      unsubscribeToken: createToken()
    });

    return { ok: true, duplicate: false };
  }
});

export const unsubscribe = mutation({
  args: {
    token: v.string()
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_unsubscribeToken", (q) => q.eq("unsubscribeToken", args.token))
      .unique();

    if (!subscriber) {
      throw new ConvexError("Invalid unsubscribe token");
    }

    if (subscriber.status === "unsubscribed") {
      return { ok: true };
    }

    await ctx.db.patch(subscriber._id, {
      status: "unsubscribed",
      unsubscribedAt: Date.now()
    });

    return { ok: true };
  }
});

export const listSubscribers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("subscribers").collect();
  }
});

export const exportSubscribersCSV = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("subscribers").collect();

    const lines = ["email,status,subscribedAt,unsubscribedAt"];
    for (const row of rows) {
      lines.push(
        [
          row.email,
          row.status,
          new Date(row.subscribedAt).toISOString(),
          row.unsubscribedAt ? new Date(row.unsubscribedAt).toISOString() : ""
        ].join(",")
      );
    }

    return lines.join("\n");
  }
});
