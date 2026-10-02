import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { seoField } from "../fields/seo"
import { LISTING_COPY } from "../../content/starter-copy"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

export const ListingPages: GlobalConfig = {
  slug: "listing-pages",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      name: "services",
      type: "group",
      fields: [
        {
          name: "kicker",
          type: "text",
          defaultValue: "SERVICES / 01—06",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Software for the hard parts of work.",
        },
        {
          name: "intro",
          type: "textarea",
          localized: true,
          defaultValue:
            "From a new digital product to a core business system, we bring product thinking, design, and engineering together.",
        },
        {
          name: "cardNote",
          type: "textarea",
          localized: true,
          defaultValue: LISTING_COPY.servicesCardNote.en,
          admin: { description: "Sentence appended to every service card. Leave empty to show only the service description." },
        },
        seoField(),
      ],
    },
    {
      name: "products",
      type: "group",
      fields: [
        {
          name: "kicker",
          type: "text",
          defaultValue: "INHERITIX PRODUCTS",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Products shaped by real operations.",
        },
        {
          name: "intro",
          type: "textarea",
          localized: true,
          defaultValue:
            "We build and own focused software products for industries where clarity, speed, and a dependable workflow matter.",
        },
        seoField(),
      ],
    },
    {
      name: "projects",
      type: "group",
      fields: [
        {
          name: "kicker",
          type: "text",
          defaultValue: "PROJECTS",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Digital systems designed for real work.",
        },
        {
          name: "intro",
          type: "textarea",
          localized: true,
          defaultValue:
            "Operational platforms and digital products designed and engineered with our clients.",
        },
        seoField(),
      ],
    },
    {
      name: "insights",
      type: "group",
      fields: [
        {
          name: "kicker",
          type: "text",
          defaultValue: "INSIGHTS",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "The thinking behind the work.",
        },
        {
          name: "intro",
          type: "textarea",
          localized: true,
          defaultValue:
            "Practical perspectives on product design, software engineering, automation, and the operational systems between them.",
        },
        {
          name: "sectionLabel",
          type: "text",
          localized: true,
          defaultValue: LISTING_COPY.insightsSectionLabel.en,
        },
        {
          name: "sectionTitle",
          type: "text",
          localized: true,
          defaultValue: LISTING_COPY.insightsSectionTitle.en,
        },
        seoField(),
      ],
    },
  ],
}
