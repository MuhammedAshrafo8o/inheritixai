import type { CollectionConfig } from "payload"

/**
 * Server-only secret storage. Access is denied even to administrators through
 * REST, GraphQL, and ordinary Local API calls; narrowly scoped server code uses
 * overrideAccess after authenticating the operation separately.
 */
export const EmailSecrets: CollectionConfig = {
  slug: "email-secrets",
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "key", type: "text", required: true, unique: true, index: true },
    {
      name: "ciphertext",
      type: "textarea",
      required: true,
      access: { read: () => false, create: () => false, update: () => false },
    },
  ],
}
