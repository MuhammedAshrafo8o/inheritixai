import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"
import { revalidateAllAfterChange, revalidateAllAfterDelete } from "../hooks/revalidate"

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "updatedAt"],
  },
  access: {
    read: () => true,
    create: canManageContent,
    update: canManageContent,
    delete: canDeleteContent,
  },
  hooks: {
    afterChange: [revalidateAllAfterChange],
    afterDelete: [revalidateAllAfterDelete],
  },
  fields: [
    {
      name: "name",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
  ],
}
