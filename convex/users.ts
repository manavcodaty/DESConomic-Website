import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { assertSchoolDomain } from "./lib/auth";

function adminSet() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const syncCurrentUser = mutation({
  args: {
    fallbackName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const email = String(identity.email ?? identity.emailAddress ?? "").toLowerCase();
    if (!email) {
      throw new ConvexError("Email claim missing in Clerk token. Add it to the Convex JWT template.");
    }

    assertSchoolDomain(email);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const configuredAdmins = adminSet();
    const role = configuredAdmins.has(email) || configuredAdmins.size === 0 ? "admin" : "writer";

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name: String(identity.name ?? args.fallbackName ?? existing.name)
      });
      return { ...existing, role: existing.role };
    }

    const createdAt = Date.now();
    const id = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email,
      name: String(identity.name ?? args.fallbackName ?? "Student Writer"),
      role,
      createdAt
    });

    return await ctx.db.get(id);
  }
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
  }
});
