import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

export const ListingPages: GlobalConfig = {
  slug: "listing-pages",
  access: {
    read: () => true,
    update: canManageContent,
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
            "Production-ready layouts for approved projects once Payload is connected.",
        },
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
      ],
    },
  ],
}
