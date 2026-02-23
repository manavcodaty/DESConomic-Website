import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: number | string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(typeof value === "number" ? new Date(value) : new Date(value));
}

export function readingTimeFromJson(doc: unknown) {
  const text = JSON.stringify(doc ?? "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function createSlug(input: string) {
  return slugify(input, {
    lower: true,
    strict: true,
    trim: true
  });
}

export function isAllowedSchoolEmail(email: string, domain: string) {
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

export function randomToken(length = 42) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
