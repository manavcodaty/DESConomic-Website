export const TOPIC_DEFAULTS = [
  "Markets",
  "Policy",
  "Business",
  "Tech",
  "Opinion",
  "School Economy"
] as const;

export const ARTICLE_STATUSES = [
  "draft",
  "submitted",
  "rejected",
  "approved",
  "published",
  "scheduled"
] as const;

export const SUBSCRIBER_STATUSES = ["active", "unsubscribed"] as const;

export const REVIEW_SEND_STATUSES = ["not_sent", "sending", "sent", "failed"] as const;
