import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

function validateHex(val: string | null | undefined): true | string {
  if (!val) return true
  return hexColorRegex.test(val) ? true : "Must be a valid hex color code (e.g. #00CCFF)."
}

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  access: {
    read: () => true,
    update: canManageContent,
  },
  fields: [
    {
      name: "siteName",
      type: "text",
      defaultValue: "INHERITIX",
      required: true,
    },
    {
      name: "brandColors",
      type: "group",
      admin: {
        description: "Validated brand colors used across UI accents.",
      },
      fields: [
        {
          name: "primary",
          type: "text",
          defaultValue: "#0066FF",
          validate: validateHex,
        },
        {
          name: "accent",
          type: "text",
          defaultValue: "#00CCFF",
          validate: validateHex,
        },
        {
          name: "dark",
          type: "text",
          defaultValue: "#060A11",
          validate: validateHex,
        },
      ],
    },
    {
      name: "defaultSeo",
      type: "group",
      fields: [
        {
          name: "title",
          type: "text",
          localized: true,
          defaultValue: "Beautifully designed. Seriously engineered.",
        },
        {
          name: "description",
          type: "textarea",
          localized: true,
          defaultValue:
            "Inheritix builds software that makes complex businesses easier to run and digital products people enjoy using.",
        },
        {
          name: "ogImage",
          type: "upload",
          relationTo: "media",
        },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      fields: [
        {
          name: "platform",
          type: "text",
          required: true,
        },
        {
          name: "url",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "footerHeading",
      type: "text",
      localized: true,
      defaultValue: "Have a project in mind?",
    },
    {
      name: "footerInvitation",
      type: "text",
      localized: true,
      defaultValue: "Let’s make something worth using.",
    },
    {
      name: "footerCtaLabel",
      type: "text",
      localized: true,
      defaultValue: "Tell us what you’re building",
    },
    {
      name: "copyright",
      type: "text",
      defaultValue: "INHERITIX Technologies",
    },
    {
      name: "location",
      type: "text",
      defaultValue: "Amman, Jordan",
    },
  ],
}
