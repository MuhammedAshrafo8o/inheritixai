import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"
import { allContentBlocks } from "../blocks"

function isValidUrl(val: string | null | undefined): true | string {
  if (!val) return true
  try {
    const url = new URL(val)
    if (url.protocol === "http:" || url.protocol === "https:") return true
    return "URL must start with http:// or https://"
  } catch {
    return "Please enter a valid URL."
  }
}

export const Projects: CollectionConfig = {
  slug: "projects",
  admin: {
    useAsTitle: "slug",
    defaultColumns: ["slug", "client", "featured", "displayOrder", "_status", "updatedAt"],
    preview: (doc, { req }) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=projects&slug=${doc.slug}`
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
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Handle permanent redirect and slug tracking if slug changes on published document
        if (
          operation === "update" &&
          previousDoc?.slug &&
          doc.slug &&
          previousDoc.slug !== doc.slug
        ) {
          try {
            await req.payload.create({
              collection: "redirects",
              data: {
                from: `/projects/${previousDoc.slug}`,
                to: `/projects/${doc.slug}`,
                statusCode: "308",
              },
            })
            await req.payload.create({
              collection: "redirects",
              data: {
                from: `/ar/projects/${previousDoc.slug}`,
                to: `/ar/projects/${doc.slug}`,
                statusCode: "308",
              },
            })
          } catch {
            // Redirect may already exist
          }
        }
      },
    ],
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "URL slug for this project (e.g. logistics-control-system).",
      },
    },
    {
      name: "title",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "client",
      type: "relationship",
      relationTo: "clients",
      required: true,
      admin: {
        description: "Client organization for this project.",
      },
    },
    {
      name: "summary",
      type: "textarea",
      localized: true,
      required: true,
      admin: {
        description: "Short summary shown on project cards.",
      },
    },
    {
      name: "intro",
      type: "textarea",
      localized: true,
      admin: {
        description: "Introduction displayed in the project hero.",
      },
    },
    {
      name: "sector",
      type: "text",
      localized: true,
      required: true,
      admin: {
        description: "Industry / sector (e.g. Enterprise operations, Logistics, Hospitality).",
      },
    },
    {
      name: "year",
      type: "text",
      required: true,
      defaultValue: "2026",
    },
    {
      name: "services",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        {
          name: "name",
          type: "text",
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: "techStack",
      type: "array",
      fields: [
        {
          name: "technology",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "cardImage",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: {
        description: "Project card cover image.",
      },
    },
    {
      name: "heroImage",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: {
        description: "Hero visual displayed at the top of the detail page.",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Feature this project on the homepage.",
      },
    },
    {
      name: "displayOrder",
      type: "number",
      defaultValue: 0,
      admin: {
        description: "Display ordering priority (lower numbers appear first).",
      },
    },
    {
      name: "externalLinks",
      type: "array",
      admin: {
        description: "Reorderable external links (e.g. live product, case publication).",
      },
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "url",
          type: "text",
          required: true,
          validate: isValidUrl,
        },
      ],
    },
    {
      name: "blocks",
      type: "blocks",
      blocks: allContentBlocks,
      admin: {
        description: "Modular story blocks (intro, metrics, rich text, images, quote, cta).",
      },
    },
    {
      name: "relatedProjects",
      type: "relationship",
      relationTo: "projects",
      hasMany: true,
      admin: {
        description: "Related projects displayed at the bottom of the page.",
      },
    },
    {
      name: "previousSlugs",
      type: "array",
      admin: {
        readOnly: true,
        description: "History of previously published slugs.",
      },
      fields: [
        {
          name: "slug",
          type: "text",
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
        {
          name: "noIndex",
          type: "checkbox",
          defaultValue: false,
        },
      ],
    },
  ],
}
