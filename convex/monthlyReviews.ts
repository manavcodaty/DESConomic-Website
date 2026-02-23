import { action, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { api } from "./_generated/api";
import { Resend } from "resend";

function createSecureToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export const generateMonthlyReviewUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  }
});

export const uploadMonthlyReviewPDF = mutation({
  args: {
    monthLabel: v.string(),
    pdfStorageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const id = await ctx.db.insert("monthlyReviews", {
      monthLabel: args.monthLabel,
      pdfStorageId: args.pdfStorageId,
      createdAt: Date.now(),
      createdByClerkUserId: admin.clerkUserId,
      sendStatus: "not_sent",
      secureToken: createSecureToken()
    });

    return await ctx.db.get(id);
  }
});

export const listMonthlyReviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const list = await ctx.db.query("monthlyReviews").collect();
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }
});

export const getMonthlyReviewLink = query({
  args: {
    monthlyReviewId: v.id("monthlyReviews")
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.monthlyReviewId);
    if (!review) throw new ConvexError("Monthly review not found");

    return `${siteUrl()}/review/${review._id}?token=${review.secureToken}`;
  }
});

export const getReviewDownloadUrl = query({
  args: {
    monthlyReviewId: v.id("monthlyReviews"),
    token: v.string()
  },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.monthlyReviewId);
    if (!review) return null;
    if (review.secureToken !== args.token) return null;

    const pdfUrl = await ctx.storage.getUrl(review.pdfStorageId);

    return {
      monthLabel: review.monthLabel,
      pdfUrl
    };
  }
});

export const sendMonthlyReview = action({
  args: {
    monthlyReviewId: v.id("monthlyReviews")
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(api.users.getMe, {});
    if (!me || me.role !== "admin") {
      throw new ConvexError("Admin required");
    }

    const review = await ctx.runQuery(api.monthlyReviews.getReviewForSend, {
      monthlyReviewId: args.monthlyReviewId
    });

    if (!review) {
      throw new ConvexError("Review missing");
    }

    await ctx.runMutation(api.monthlyReviews.markSending, {
      monthlyReviewId: args.monthlyReviewId
    });

    const subscribers = await ctx.runQuery(api.monthlyReviews.listActiveSubscribersInternal, {});
    const resend = new Resend(process.env.RESEND_API_KEY);
    const batchSize = 50;

    const logId = await ctx.runMutation(api.monthlyReviews.createSendLog, {
      monthlyReviewId: args.monthlyReviewId,
      totalRecipients: subscribers.length
    });

    let successCount = 0;
    let failureCount = 0;
    const failureSamples: string[] = [];

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscriber: any) => {
          try {
            const reviewLink = `${siteUrl()}/review/${review._id}?token=${review.secureToken}`;
            const unsubscribeLink = `${siteUrl()}/unsubscribe?token=${subscriber.unsubscribeToken}`;
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "DESConomic Review <onboarding@resend.dev>",
              to: subscriber.email,
              subject: `${review.monthLabel} - DESConomic Review`,
              html: `<p>Hello,</p><p>Your monthly DESConomic Review PDF is ready:</p><p><a href="${reviewLink}">Open ${review.monthLabel} issue</a></p><p><a href="${unsubscribeLink}">Unsubscribe</a></p>`
            });
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            if (failureSamples.length < 8) {
              failureSamples.push(`${subscriber.email}: ${String(error)}`);
            }
          }
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    await ctx.runMutation(api.monthlyReviews.finishSendLog, {
      logId,
      successCount,
      failureCount,
      failureSamples
    });

    await ctx.runMutation(api.monthlyReviews.markSendStatus, {
      monthlyReviewId: args.monthlyReviewId,
      sendStatus: failureCount === 0 ? "sent" : successCount > 0 ? "failed" : "failed",
      sentAt: successCount > 0 ? Date.now() : undefined
    });

    return { successCount, failureCount };
  }
});

export const getReviewForSend = query({
  args: { monthlyReviewId: v.id("monthlyReviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.monthlyReviewId);
  }
});

export const listActiveSubscribersInternal = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("subscribers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  }
});

export const createSendLog = mutation({
  args: {
    monthlyReviewId: v.id("monthlyReviews"),
    totalRecipients: v.number()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await ctx.db.insert("emailSendLogs", {
      monthlyReviewId: args.monthlyReviewId,
      startedAt: Date.now(),
      totalRecipients: args.totalRecipients,
      successCount: 0,
      failureCount: 0
    });
  }
});

export const finishSendLog = mutation({
  args: {
    logId: v.id("emailSendLogs"),
    successCount: v.number(),
    failureCount: v.number(),
    failureSamples: v.array(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.logId, {
      finishedAt: Date.now(),
      successCount: args.successCount,
      failureCount: args.failureCount,
      failureSamples: args.failureSamples
    });
    return { ok: true };
  }
});

export const markSending = mutation({
  args: {
    monthlyReviewId: v.id("monthlyReviews")
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.monthlyReviewId, {
      sendStatus: "sending"
    });
    return { ok: true };
  }
});

export const markSendStatus = mutation({
  args: {
    monthlyReviewId: v.id("monthlyReviews"),
    sendStatus: v.union(v.literal("not_sent"), v.literal("sending"), v.literal("sent"), v.literal("failed")),
    sentAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.monthlyReviewId, {
      sendStatus: args.sendStatus,
      sentAt: args.sentAt
    });
    return { ok: true };
  }
});

export const listEmailSendLogs = query({
  args: {
    monthlyReviewId: v.optional(v.id("monthlyReviews"))
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const logs = args.monthlyReviewId
      ? await ctx.db
          .query("emailSendLogs")
          .withIndex("by_monthlyReviewId", (q) => q.eq("monthlyReviewId", args.monthlyReviewId!))
          .collect()
      : await ctx.db.query("emailSendLogs").collect();

    return logs.sort((a, b) => b.startedAt - a.startedAt);
  }
});
