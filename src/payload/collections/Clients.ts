import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"

function isValidUrl(val: string | null | undefined): true | string {
  if (!val) return true
  try {
    const url = new URL(val)
    if (url.protocol === "http:" || url.protocol === "https:") return true
    return "URL must start with http:// or https://"
  } catch {
    return "Please enter a valid website URL."
  }
}

export const Clients: CollectionConfig = {
  slug: "clients",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "website", "updatedAt"],
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
      name: "logo",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "logoDescription",
      type: "text",
      localized: true,
      required: true,
      admin: {
        description: "Localized description of the client's mark or logo.",
      },
    },
    {
      name: "website",
      type: "text",
      validate: isValidUrl,
      admin: {
        description: "Optional client website (e.g. https://example.com).",
      },
    },
    {
      name: "displayMode",
      type: "select",
      defaultValue: "original",
      options: [
        { label: "Original Brand Colors (Default)", value: "original" },
        { label: "Monochrome", value: "monochrome" },
      ],
      admin: {
        description: "Original brand colors are preserved by default as requested.",
      },
    },
  ],
}
