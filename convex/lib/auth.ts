import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";

export type AppRole = "admin" | "writer";

type Ctx = QueryCtx | MutationCtx;

function allowedDomain() {
  return (process.env.ALLOWED_SCHOOL_DOMAIN ?? "dess.sch.ae").toLowerCase();
}

export async function getCurrentIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }

  return identity;
}

export async function getCurrentUserRecord(ctx: Ctx) {
  const identity = await getCurrentIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User profile missing. Visit /upload once to initialize your profile.");
  }

  return { identity, user };
}

export function assertSchoolDomain(email: string) {
  const domain = allowedDomain();
  if (!email.toLowerCase().endsWith(`@${domain}`)) {
    throw new ConvexError(`Only ${domain} email addresses can access this portal.`);
  }
}

export async function requireRole(ctx: Ctx, role: AppRole) {
  const { user } = await getCurrentUserRecord(ctx);
  if (user.role !== role) {
    throw new ConvexError("Forbidden");
  }
  return user;
}

export async function requireAdmin(ctx: Ctx) {
  return requireRole(ctx, "admin");
}
