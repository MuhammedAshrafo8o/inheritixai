import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

export const Navigation: GlobalConfig = {
  slug: "navigation",
  access: {
    read: () => true,
    update: canManageContent,
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
