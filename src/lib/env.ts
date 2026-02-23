export const env = {
  schoolDomain: process.env.ALLOWED_SCHOOL_DOMAIN ?? "dess.sch.ae",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
};
