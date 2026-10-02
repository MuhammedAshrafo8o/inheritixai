import type { CollectionConfig } from "payload"
import { canDeleteContent, canManageContent, publicOrAuthenticatedRead } from "../../cms/access"
import { slugField } from "../fields/slug"
import { SERVICE_SECTION_COPY } from "../../content/starter-copy"
import { seoField } from "../fields/seo"
import { revalidateRoutableAfterChange, revalidateRoutableAfterDelete } from "../hooks/revalidate"
import { createPublishedSlugRedirects, detectPublishedSlugChange } from "../hooks/slugRedirects"

export const Services: CollectionConfig = {
  slug: "services",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["number", "slug", "title", "_status", "updatedAt"],
    preview: (doc, { locale }) => {
      if (!doc?.slug) return null
      return `/api/preview?collection=services&slug=${encodeURIComponent(String(doc.slug))}&lang=${locale === "ar" ? "ar" : "en"}`
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
    beforeChange: [detectPublishedSlugChange("services")],
    afterChange: [createPublishedSlugRedirects("services"), revalidateRoutableAfterChange("services")],
    afterDelete: [revalidateRoutableAfterDelete("services")],
  },
  fields: [
    {
      name: "number",
      type: "text",
      required: true,
      defaultValue: "01",
    },
    slugField(),
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
      defaultValue: SERVICE_SECTION_COPY.problemHeading.en,
    },
    {
      name: "problemDescription",
      type: "textarea",
      localized: true,
      defaultValue: SERVICE_SECTION_COPY.problemDescription.en,
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
      defaultValue: SERVICE_SECTION_COPY.deliverablesHeading.en,
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
      defaultValue: SERVICE_SECTION_COPY.processHeading.en,
    },
    {
      name: "processDescription",
      type: "textarea",
      localized: true,
      defaultValue: SERVICE_SECTION_COPY.processDescription.en,
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
      defaultValue: SERVICE_SECTION_COPY.nextHeading.en,
    },
    {
      name: "displayOrder",
      type: "number",
      defaultValue: 0,
    },
    seoField(),
  ],
}
