import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { seoField } from "../fields/seo"
import { CONTACT_FORM_COPY } from "../../content/starter-copy"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

export const ContactPage: GlobalConfig = {
  slug: "page-contact",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      name: "kicker",
      type: "text",
      defaultValue: "START A CONVERSATION",
    },
    {
      name: "title",
      type: "text",
      localized: true,
      defaultValue: "What can we build together?",
      required: true,
    },
    {
      name: "intro",
      type: "textarea",
      localized: true,
      defaultValue:
        "Choose the conversation that fits. We’ll make sure it reaches the right people.",
      required: true,
    },
    {
      name: "directEmail",
      type: "text",
      defaultValue: "hello@inheritix.com",
    },
    {
      name: "directNote",
      type: "textarea",
      localized: true,
      defaultValue:
        "For partnerships, careers, and everything else, use general inquiry.",
    },
    {
      name: "boundaryNotice",
      type: "textarea",
      localized: true,
      defaultValue:
        "Online submission endpoint and email routing are scheduled for Milestone Three. Please contact us directly at hello@inheritix.com for active inquiries.",
      admin: {
        hidden: true,
        description: "Legacy Milestone Two notice; retained for data compatibility and no longer rendered.",
      },
    },
    {
      name: "form",
      type: "group",
      admin: {
        description:
          "Contact form copy. Product and service choices come from published Products and Services; submissions are handled by the protected inquiry endpoint.",
      },
      fields: (Object.keys(CONTACT_FORM_COPY) as Array<keyof typeof CONTACT_FORM_COPY>).map((name) => ({
        name,
        type: "text" as const,
        localized: true,
        defaultValue: CONTACT_FORM_COPY[name].en,
        required: !new Set(["namePlaceholder", "emailPlaceholder", "messagePlaceholder"]).has(name),
        validate: (value: unknown) => {
          if (new Set(["namePlaceholder", "emailPlaceholder", "messagePlaceholder"]).has(name)) return true
          return typeof value === "string" && value.trim() ? true : "This operational form label or message is required in each locale."
        },
      })),
    },
    seoField(),
  ],
}
