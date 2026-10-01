import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "category", "author", "_status", "updatedAt"],
    preview: (doc) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=posts&slug=${doc.slug}`
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
      name: "title",
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
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
    },
    {
      name: "categoryLabel",
      type: "text",
      localized: true,
      admin: {
        description: "Display category label (e.g. PRODUCT THINKING, AI & AUTOMATION, DESIGN).",
      },
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "authors",
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "readTime",
      type: "text",
      defaultValue: "7 min read",
    },
    {
      name: "color",
      type: "select",
      defaultValue: "ink",
      options: [
        { label: "Ink (Dark Slate)", value: "ink" },
        { label: "Blue (Primary Cobalt)", value: "blue" },
        { label: "Cyan (Electric Teal)", value: "cyan" },
      ],
    },
    {
      name: "excerpt",
      type: "textarea",
      localized: true,
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "coverLabel",
      type: "text",
      defaultValue: "USE",
    },
    {
      name: "coverSubtext",
      type: "text",
      defaultValue: "FUL",
    },
    {
      name: "coverCaption",
      type: "text",
      localized: true,
      defaultValue: "Clarity is a product feature, not a visual preference.",
    },
    {
      name: "leadParagraph",
      type: "textarea",
      localized: true,
    },
    {
      name: "sections",
      type: "array",
      fields: [
        {
          name: "sectionId",
          type: "text",
          admin: {
            description: "Anchor ID for on-page table of contents (e.g. friction, workflow).",
          },
        },
        {
          name: "heading",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "body",
          type: "textarea",
          localized: true,
          required: true,
        },
        {
          name: "quote",
          type: "textarea",
          localized: true,
        },
      ],
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
