import path from "path"
import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"
import { revalidateAllAfterChange, revalidateAllAfterDelete } from "../hooks/revalidate"

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    staticDir: path.resolve(process.cwd(), "public/media"),
    adminThumbnail: "thumbnail",
    mimeTypes: ["image/*", "application/pdf", "image/svg+xml"],
    imageSizes: [
      {
        name: "thumbnail",
        width: 320,
        height: 240,
        position: "centre",
      },
      {
        name: "card",
        width: 800,
        height: 600,
        position: "centre",
      },
      {
        name: "hero",
        width: 1600,
        height: 1200,
        position: "centre",
      },
    ],
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
  admin: {
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "mimeType", "filesize", "updatedAt"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      localized: true,
      required: true,
      admin: {
        description: "Meaningful screen reader description in English and Arabic.",
      },
    },
    {
      name: "description",
      type: "textarea",
      localized: true,
      admin: {
        description: "Detailed description of the asset for editorial use.",
      },
    },
    {
      name: "caption",
      type: "text",
      localized: true,
    },
  ],
}
