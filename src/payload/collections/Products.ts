import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "badge", "_status", "updatedAt"],
    preview: (doc) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=products&slug=${doc.slug}`
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
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "badge",
      type: "text",
      required: true,
      admin: {
        description: "Eyebrow tag (e.g. 01 / LOGISTICS OPERATIONS).",
      },
    },
    {
      name: "category",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "tagline",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "summary",
      type: "textarea",
      localized: true,
      required: true,
    },
    {
      name: "heroHeadline",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "heroDescription",
      type: "textarea",
      localized: true,
      required: true,
    },
    {
      name: "visualType",
      type: "select",
      defaultValue: "dashboard",
      options: [
        { label: "Operations Dashboard Mockup", value: "dashboard" },
        { label: "Restaurant Mobile Phones Mockup", value: "phone" },
      ],
    },
    {
      name: "valuePoints",
      type: "array",
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "description",
          type: "text",
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: "workflowSteps",
      type: "array",
      fields: [
        {
          name: "stepNumber",
          type: "text",
          required: true,
        },
        {
          name: "name",
          type: "text",
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: "tourTitle",
      type: "text",
      localized: true,
    },
    {
      name: "tourDescription",
      type: "textarea",
      localized: true,
    },
    {
      name: "faqs",
      type: "array",
      fields: [
        {
          name: "question",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "answer",
          type: "textarea",
          localized: true,
          required: true,
        },
      ],
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
