import type { Field } from "payload"

/**
 * Localized, editable SEO group shared by routable collections and page globals.
 * Empty values fall back to the record's own title/summary, then to the
 * SiteSettings default SEO.
 */
export function seoField(): Field {
  return {
    name: "seo",
    type: "group",
    admin: {
      description:
        "Search and social metadata. Leave blank to use the page content and the site defaults.",
    },
    fields: [
      {
        name: "title",
        type: "text",
        localized: true,
        maxLength: 120,
      },
      {
        name: "description",
        type: "textarea",
        localized: true,
        maxLength: 320,
      },
      {
        name: "ogImage",
        type: "upload",
        relationTo: "media",
        admin: {
          description: "Social sharing image (1200×630 recommended).",
        },
      },
      {
        name: "noIndex",
        type: "checkbox",
        defaultValue: false,
        admin: {
          description: "Hide this page from search engines and the sitemap.",
        },
      },
    ],
  }
}
