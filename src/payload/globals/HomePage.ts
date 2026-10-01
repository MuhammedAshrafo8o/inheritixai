import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

export const HomePage: GlobalConfig = {
  slug: "page-home",
  access: {
    read: () => true,
    update: canManageContent,
  },
  fields: [
    {
      name: "heroIndex",
      type: "text",
      defaultValue: "INH—01 / DIGITAL PRODUCTS",
    },
    {
      name: "heroTitleA",
      type: "text",
      localized: true,
      defaultValue: "Beautifully designed.",
      required: true,
    },
    {
      name: "heroTitleB",
      type: "text",
      localized: true,
      defaultValue: "Seriously engineered.",
      required: true,
    },
    {
      name: "heroCopy",
      type: "textarea",
      localized: true,
      defaultValue:
        "We build software that makes complex businesses easier to run—and digital products people enjoy using.",
      required: true,
    },
    {
      name: "heroPrimaryCta",
      type: "group",
      fields: [
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Explore Our Work",
        },
        {
          name: "href",
          type: "text",
          defaultValue: "/projects",
        },
      ],
    },
    {
      name: "heroSecondaryCta",
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
    {
      name: "showcaseSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "stageLabel",
          type: "text",
          defaultValue: "01 LOGISTICS, IN MOTION",
        },
        {
          name: "stageNote",
          type: "text",
          localized: true,
          defaultValue: "Two products. One standard: clarity.",
        },
      ],
    },
    {
      name: "selectedWorkSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Selected work",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Digital products with real work to do.",
        },
      ],
    },
    {
      name: "capabilitiesSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Capabilities",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "From first idea to working system.",
        },
      ],
    },
    {
      name: "productsDarkSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Our products",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Software we believe in—and build.",
        },
      ],
    },
    {
      name: "approachSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Our approach",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Four phases. One connected team.",
        },
        {
          name: "phases",
          type: "array",
          fields: [
            {
              name: "number",
              type: "text",
              required: true,
            },
            {
              name: "name",
              type: "text",
              localized: true,
              required: true,
            },
            {
              name: "description",
              type: "textarea",
              localized: true,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "perspectiveSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "eyebrow",
          type: "text",
          localized: true,
          defaultValue: "Our perspective",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Beauty isn’t the final layer. It’s a way of thinking.",
        },
        {
          name: "description",
          type: "textarea",
          localized: true,
          defaultValue:
            "We are one design and engineering team. We believe the best software makes complexity understandable—and everyday work more human.",
        },
        {
          name: "ctaLabel",
          type: "text",
          localized: true,
          defaultValue: "About Inheritix",
        },
        {
          name: "imageUrl",
          type: "text",
          defaultValue:
            "https://images.unsplash.com/photo-1624012040540-55a09b58686b?auto=format&fit=crop&w=1400&q=85",
        },
      ],
    },
    {
      name: "insightsSection",
      type: "group",
      fields: [
        {
          name: "visible",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          defaultValue: "Our perspective",
        },
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Thinking for better digital work.",
        },
      ],
    },
  ],
}
