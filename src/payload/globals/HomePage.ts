import type { Field, GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { seoField } from "../fields/seo"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

export const HOME_SECTIONS = [
  { label: "Product showcase stage", value: "showcase" },
  { label: "Selected work", value: "selectedWork" },
  { label: "Capabilities (services)", value: "capabilities" },
  { label: "Our products (dark)", value: "products" },
  { label: "Our approach", value: "approach" },
  { label: "Perspective", value: "perspective" },
  { label: "Insights", value: "insights" },
] as const

export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["value"]

function validateHref(val: string | null | undefined): true | string {
  if (!val) return true
  if (val.startsWith("/") && !val.startsWith("//")) return true
  if (/^https?:\/\//.test(val) || val.startsWith("mailto:")) return true
  return "Use a site path (/projects) or a full https:// URL."
}

function link(name: string, label: string, href: string): Field {
  return {
    name,
    type: "group",
    fields: [
      { name: "label", type: "text", localized: true, defaultValue: label },
      {
        name: "href",
        type: "text",
        defaultValue: href,
        validate: validateHref,
        admin: { description: "Site paths are automatically prefixed with /ar on the Arabic site." },
      },
    ],
  }
}

const visible: Field = {
  name: "visible",
  type: "checkbox",
  defaultValue: true,
  admin: { description: "Show this section on the homepage." },
}

export const HomePage: GlobalConfig = {
  slug: "page-home",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Hero",
          fields: [
            {
              name: "heroIndex",
              type: "text",
              localized: true,
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
            link("heroPrimaryCta", "Explore Our Work", "/projects"),
            link("heroSecondaryCta", "Start a Project", "/contact"),
          ],
        },
        {
          label: "Section order",
          fields: [
            {
              name: "sectionOrder",
              type: "array",
              labels: { singular: "Section", plural: "Sections" },
              admin: {
                description:
                  "Drag to reorder homepage sections. Sections missing from this list are appended in the default order. Use each section's Visible toggle to hide it.",
              },
              validate: (rows: unknown) => {
                if (!Array.isArray(rows)) return true
                const keys = rows.map((row) => (row as { section?: string })?.section)
                return new Set(keys).size === keys.length ? true : "Each section can appear only once."
              },
              fields: [
                {
                  name: "section",
                  type: "select",
                  required: true,
                  options: HOME_SECTIONS.map((s) => ({ ...s })),
                },
              ],
            },
          ],
        },
        {
          label: "Sections",
          fields: [
            {
              name: "showcaseSection",
              type: "group",
              fields: [
                visible,
                {
                  name: "stageLabel",
                  type: "text",
                  localized: true,
                  defaultValue: "LOGISTICS, IN MOTION",
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
                visible,
                { name: "label", type: "text", localized: true, defaultValue: "Selected work" },
                {
                  name: "title",
                  type: "text",
                  localized: true,
                  defaultValue: "Digital products with real work to do.",
                },
                {
                  name: "featuredProduct",
                  type: "relationship",
                  relationTo: "products",
                  admin: { description: "Large feature card (name, summary and mockup come from the product)." },
                },
                {
                  name: "featuredEyebrow",
                  type: "text",
                  localized: true,
                  defaultValue: "INHERITIX PRODUCT · LOGISTICS",
                },
                {
                  name: "secondaryProduct",
                  type: "relationship",
                  relationTo: "products",
                  admin: { description: "Smaller product card." },
                },
                {
                  name: "secondaryEyebrow",
                  type: "text",
                  localized: true,
                  defaultValue: "INHERITIX PRODUCT · HOSPITALITY",
                },
                {
                  name: "productCtaLabel",
                  type: "text",
                  localized: true,
                  defaultValue: "View product",
                },
                {
                  name: "storyCard",
                  type: "group",
                  admin: { description: "Capability story card next to the product card." },
                  fields: [
                    { name: "visible", type: "checkbox", defaultValue: true },
                    {
                      name: "source",
                      type: "select",
                      defaultValue: "manual",
                      options: [
                        { label: "Manual copy below", value: "manual" },
                        { label: "First published featured project", value: "featuredProject" },
                      ],
                      admin: {
                        description:
                          "“Featured project” shows the first published project marked Featured (by display order), falling back to the manual copy when none exists.",
                      },
                    },
                    { name: "visualIndex", type: "text", defaultValue: "01—06" },
                    {
                      name: "visualText",
                      type: "text",
                      localized: true,
                      defaultValue: "Systems that fit the business.",
                    },
                    {
                      name: "eyebrow",
                      type: "text",
                      localized: true,
                      defaultValue: "CAPABILITY STORY · CUSTOM SOFTWARE",
                    },
                    { name: "title", type: "text", localized: true, defaultValue: "Built around the work" },
                    {
                      name: "description",
                      type: "textarea",
                      localized: true,
                      defaultValue: "We turn complex workflows into clear tools that teams can rely on.",
                    },
                    link("cta", "See the service", "/services/custom-software"),
                  ],
                },
              ],
            },
            {
              name: "capabilitiesSection",
              type: "group",
              fields: [
                visible,
                { name: "label", type: "text", localized: true, defaultValue: "Capabilities" },
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
                visible,
                { name: "label", type: "text", localized: true, defaultValue: "Our products" },
                {
                  name: "title",
                  type: "text",
                  localized: true,
                  defaultValue: "Software we believe in—and build.",
                },
                {
                  name: "ctaPrefix",
                  type: "text",
                  localized: true,
                  defaultValue: "Explore",
                  admin: { description: "Button text before the product name, e.g. “Explore LOGISTTEX”." },
                },
              ],
            },
            {
              name: "approachSection",
              type: "group",
              fields: [
                visible,
                { name: "label", type: "text", localized: true, defaultValue: "Our approach" },
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
                    { name: "number", type: "text", required: true },
                    { name: "name", type: "text", localized: true, required: true },
                    { name: "description", type: "textarea", localized: true, required: true },
                  ],
                },
              ],
            },
            {
              name: "perspectiveSection",
              type: "group",
              fields: [
                visible,
                { name: "eyebrow", type: "text", localized: true, defaultValue: "Our perspective" },
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
                link("cta", "About Inheritix", "/about"),
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  admin: { description: "Uploaded image (preferred). Its localized alt text is used." },
                },
                {
                  name: "imageUrl",
                  type: "text",
                  defaultValue:
                    "https://images.unsplash.com/photo-1624012040540-55a09b58686b?auto=format&fit=crop&w=1400&q=85",
                  admin: { description: "Fallback external image when no upload is selected." },
                },
                {
                  name: "imageAlt",
                  type: "text",
                  localized: true,
                  defaultValue: "Geometric blue and white architectural facade",
                  admin: { description: "Alt text for the fallback external image." },
                },
              ],
            },
            {
              name: "insightsSection",
              type: "group",
              fields: [
                visible,
                { name: "label", type: "text", localized: true, defaultValue: "Our perspective" },
                {
                  name: "title",
                  type: "text",
                  localized: true,
                  defaultValue: "Thinking for better digital work.",
                },
              ],
            },
          ],
        },
        {
          label: "SEO",
          fields: [seoField()],
        },
      ],
    },
  ],
}
