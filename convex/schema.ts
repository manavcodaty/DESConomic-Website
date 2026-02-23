import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("writer")),
    createdAt: v.number()
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"]),

  topics: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_name", ["name"]),

  articles: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    slug: v.string(),
    excerpt: v.string(),
    body: v.any(),
    coverImageStorageId: v.optional(v.id("_storage")),
    inlineImageStorageIds: v.optional(v.array(v.id("_storage"))),
    authorClerkUserId: v.string(),
    authorName: v.string(),
    topicId: v.id("topics"),
    tags: v.array(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("rejected"),
      v.literal("approved"),
      v.literal("published"),
      v.literal("scheduled")
    ),
    rejectionReason: v.optional(v.string()),
    featured: v.boolean(),
    publishAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_topicId", ["topicId"])
    .index("by_publishAt", ["publishAt"]),

  subscribers: defineTable({
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("unsubscribed")),
    subscribedAt: v.number(),
    unsubscribedAt: v.optional(v.number()),
    unsubscribeToken: v.string()
  })
    .index("by_email", ["email"])
    .index("by_unsubscribeToken", ["unsubscribeToken"])
    .index("by_status", ["status"]),

  monthlyReviews: defineTable({
    monthLabel: v.string(),
    pdfStorageId: v.id("_storage"),
    createdAt: v.number(),
    createdByClerkUserId: v.string(),
    sentAt: v.optional(v.number()),
    sendStatus: v.optional(
      v.union(v.literal("not_sent"), v.literal("sending"), v.literal("sent"), v.literal("failed"))
    ),
    secureToken: v.string()
  })
    .index("by_monthLabel", ["monthLabel"]),

  emailSendLogs: defineTable({
    monthlyReviewId: v.id("monthlyReviews"),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    totalRecipients: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    failureSamples: v.optional(v.array(v.string()))
  }).index("by_monthlyReviewId", ["monthlyReviewId"])
});
