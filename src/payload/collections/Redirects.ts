import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"

export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    useAsTitle: "from",
    defaultColumns: ["from", "to", "statusCode", "updatedAt"],
  },
  access: {
    read: () => true,
    create: canManageContent,
    update: canManageContent,
    delete: canDeleteContent,
  },
  fields: [
    {
      name: "from",
      type: "text",
      required: true,
      unique: true,
      index: true,
      validate: (val: string | null | undefined) => {
        if (!val) return "Source path is required"
        if (!val.startsWith("/")) return "Source path must start with a slash (/)"
        return true
      },
    },
    {
      name: "to",
      type: "text",
      required: true,
      validate: (val: string | null | undefined, { data }: { data: Record<string, unknown> }) => {
        if (!val) return "Destination path is required"
        if (data && data.from === val) return "Destination cannot be identical to source path (redirect loop prevention)"
        return true
      },
    },
    {
      name: "statusCode",
      type: "select",
      defaultValue: "308",
      options: [
        { label: "308 Permanent Redirect", value: "308" },
        { label: "301 Moved Permanently", value: "301" },
        { label: "307 Temporary Redirect", value: "307" },
      ],
    },
  ],
}
