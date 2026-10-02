import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

export const Navigation: GlobalConfig = {
  slug: "navigation",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      name: "items",
      type: "array",
      required: true,
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "href",
          type: "text",
          required: true,
          validate: (val: string | null | undefined) =>
            !val || (val.startsWith("/") && !val.startsWith("//"))
              ? true
              : "Navigation links must be site paths such as /services.",
          admin: { description: "English path; the Arabic site prefixes /ar automatically." },
        },
      ],
    },
    {
      name: "headerCta",
      type: "group",
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Start a Project",
        },
        {
          name: "href",
          type: "text",
          defaultValue: "/contact",
        },
      ],
    },
  ],
}
