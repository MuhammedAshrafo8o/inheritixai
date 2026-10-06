import type { CollectionConfig } from "payload"

/** Persistent, privacy-preserving counters. The key contains an HMAC, never a raw IP. */
export const InquiryRateLimits: CollectionConfig = {
  slug: "inquiry-rate-limits",
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "bucketKey", type: "text", required: true, unique: true, index: true },
    { name: "count", type: "number", required: true, min: 0, defaultValue: 0 },
    { name: "expiresAt", type: "date", required: true, index: true },
  ],
}
