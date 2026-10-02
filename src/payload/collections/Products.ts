import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"
import { slugField } from "../fields/slug"
import { seoField } from "../fields/seo"
import { revalidateRoutableAfterChange, revalidateRoutableAfterDelete } from "../hooks/revalidate"
import { createPublishedSlugRedirects, detectPublishedSlugChange } from "../hooks/slugRedirects"

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "badge", "_status", "updatedAt"],
    preview: (doc, { locale }) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=products&slug=${encodeURIComponent(String(doc.slug))}&lang=${locale === "ar" ? "ar" : "en"}`
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
  hooks: {
    beforeChange: [detectPublishedSlugChange("products")],
    afterChange: [createPublishedSlugRedirects("products"), revalidateRoutableAfterChange("products")],
    afterDelete: [revalidateRoutableAfterDelete("products")],
  },
  fields: [
    slugField(),
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
      name: "homeDescription",
      type: "textarea",
      localized: true,
      admin: {
        description: "Copy for the homepage 'Our products' section. Falls back to the summary.",
      },
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
      name: "workflowTitle",
      type: "text",
      localized: true,
      admin: { description: "Heading of the core workflow section. Leave empty to hide the heading." },
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
    seoField(),
  ],
}
