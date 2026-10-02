import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { seoField } from "../fields/seo"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

export const AboutPage: GlobalConfig = {
  slug: "page-about",
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
      defaultValue: "ABOUT INHERITIX",
    },
    {
      name: "title",
      type: "text",
      localized: true,
      defaultValue: "Product-studio confidence. Engineering-company discipline.",
      required: true,
    },
    {
      name: "intro",
      type: "textarea",
      localized: true,
      defaultValue:
        "INHERITIX Technologies designs and builds digital products, operational systems, and platforms for businesses ready to work better.",
      required: true,
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: { description: "Uploaded hero image (preferred). Its localized alt text is used." },
    },
    {
      name: "imageAlt",
      type: "text",
      localized: true,
      defaultValue: "Blue geometric architecture against open sky",
      admin: { description: "Alt text for the fallback external image." },
    },
    {
      name: "imageUrl",
      type: "text",
      defaultValue:
        "https://images.unsplash.com/photo-1624012040629-a408026c0d3b?auto=format&fit=crop&w=1800&q=85",
    },
    {
      name: "manifestoEyebrow",
      type: "text",
      localized: true,
      defaultValue: "WHAT WE BELIEVE",
    },
    {
      name: "manifestoTitle",
      type: "text",
      localized: true,
      defaultValue: "Software should respect the people who depend on it.",
    },
    {
      name: "manifestoParagraphOne",
      type: "textarea",
      localized: true,
      defaultValue:
        "That means understanding the work before proposing the interface. Making difficult decisions visible. Building systems that can change without becoming fragile.",
    },
    {
      name: "manifestoParagraphTwo",
      type: "textarea",
      localized: true,
      defaultValue:
        "We bring design and engineering into the same conversation from day one. The result is not decoration around technology. It is a product that feels coherent all the way through.",
    },
    {
      name: "principles",
      type: "array",
      fields: [
        {
          name: "number",
          type: "text",
          required: true,
        },
        {
          name: "title",
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
    seoField(),
  ],
}
