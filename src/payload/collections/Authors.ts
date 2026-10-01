import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"

export const Authors: CollectionConfig = {
  slug: "authors",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "role", "updatedAt"],
  },
  access: {
    read: () => true,
    create: canManageContent,
    update: canManageContent,
    delete: canDeleteContent,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "initials",
      type: "text",
      defaultValue: "IN",
      admin: {
        description: "Avatar badge text (e.g. IN).",
      },
    },
    {
      name: "role",
      type: "text",
      localized: true,
      defaultValue: "INHERITIX Editorial",
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "bio",
      type: "textarea",
      localized: true,
    },
  ],
}
