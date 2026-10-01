import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["number", "slug", "title", "_status", "updatedAt"],
    preview: (doc) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=services&slug=${doc.slug}`
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    read: publicOrAuthenticatedRead,
    create: canManageContent,
    update: canManageContent,
    delete: canDeleteContent,
  },
  fields: [
    {
      name: "number",
      type: "text",
      required: true,
      defaultValue: "01",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "title",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "shortDescription",
      type: "textarea",
      localized: true,
      required: true,
    },
    {
      name: "heroIntro",
      type: "textarea",
      localized: true,
    },
    {
      name: "problemEyebrow",
      type: "text",
      localized: true,
      defaultValue: "THE PROBLEM",
    },
    {
      name: "problemHeading",
      type: "text",
      localized: true,
    },
    {
      name: "problemDescription",
      type: "textarea",
      localized: true,
    },
    {
      name: "deliverablesEyebrow",
      type: "text",
      localized: true,
      defaultValue: "WHAT WE DELIVER",
    },
    {
      name: "deliverablesHeading",
      type: "text",
      localized: true,
    },
    {
      name: "deliverables",
      type: "array",
      fields: [
        {
          name: "item",
          type: "text",
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: "processEyebrow",
      type: "text",
      localized: true,
      defaultValue: "HOW WE WORK",
    },
    {
      name: "processHeading",
      type: "text",
      localized: true,
    },
    {
      name: "processDescription",
      type: "textarea",
      localized: true,
    },
    {
      name: "nextEyebrow",
      type: "text",
      localized: true,
      defaultValue: "NEXT STEP",
    },
    {
      name: "nextHeading",
      type: "text",
      localized: true,
    },
    {
      name: "displayOrder",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "seo",
      type: "group",
      fields: [
        {
          name: "title",
          type: "text",
          localized: true,
        },
        {
          name: "description",
          type: "textarea",
          localized: true,
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
        },
      ],
    },
  ],
}
