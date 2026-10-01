import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

export const ContactPage: GlobalConfig = {
  slug: "page-contact",
  access: {
    read: () => true,
    update: canManageContent,
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
        description: "Truthful boundary notice regarding form submissions in Milestone Two.",
      },
    },
  ],
}
