import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

const hexColorRegex = /^#([A-Fa-f0-9]{6})$/

function validateHex(val: string | null | undefined): true | string {
  if (!val) return true
  return hexColorRegex.test(val) ? true : "Must be a 6-digit hex color code (e.g. #00CCFF)."
}

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  fields: [
    {
      name: "siteName",
      type: "text",
      defaultValue: "INHERITIX",
      required: true,
    },
    {
      name: "branding",
      type: "group",
      admin: {
        description: "Logos and favicon used in the website header, footer and browser tab.",
      },
      fields: [
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: { description: "Header logo on light background (SVG or PNG). Falls back to the INHERITIX mark." },
        },
        {
          name: "logoLight",
          type: "upload",
          relationTo: "media",
          admin: { description: "Footer logo on dark background. Falls back to the header logo." },
        },
        {
          name: "favicon",
          type: "upload",
          relationTo: "media",
          admin: { description: "Square PNG or SVG, at least 48×48." },
        },
      ],
    },
    {
      name: "brandColors",
      type: "group",
      admin: {
        description:
          "Validated brand colors applied to the website design tokens. Defaults match the approved design.",
      },
      fields: [
        {
          name: "primary",
          type: "text",
          defaultValue: "#0178B2",
          validate: validateHex,
          admin: { description: "Primary blue (--blue): links, active navigation, accent headline." },
        },
        {
          name: "accent",
          type: "text",
          defaultValue: "#00CCFF",
          validate: validateHex,
          admin: { description: "Accent cyan (--cyan): highlights, focus rings, progress bar." },
        },
        {
          name: "dark",
          type: "text",
          defaultValue: "#0F243D",
          validate: validateHex,
          admin: { description: "Ink navy (--navy): body text, dark sections, buttons." },
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
          validate: (val: string | null | undefined) =>
            !val || /^https:\/\//.test(val) ? true : "Social links must be https:// URLs.",
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
      localized: true,
      defaultValue: "Amman, Jordan",
    },
  ],
}
