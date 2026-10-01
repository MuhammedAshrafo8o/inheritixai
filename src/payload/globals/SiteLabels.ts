import type { GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"

export const SiteLabels: GlobalConfig = {
  slug: "site-labels",
  access: {
    read: () => true,
    update: canManageContent,
  },
  fields: [
    {
      name: "exploreWork",
      type: "text",
      localized: true,
      defaultValue: "Explore Our Work",
    },
    {
      name: "startProject",
      type: "text",
      localized: true,
      defaultValue: "Start a Project",
    },
    {
      name: "viewProduct",
      type: "text",
      localized: true,
      defaultValue: "View product",
    },
    {
      name: "readStory",
      type: "text",
      localized: true,
      defaultValue: "Read the story",
    },
    {
      name: "seeService",
      type: "text",
      localized: true,
      defaultValue: "See service",
    },
    {
      name: "requestDemo",
      type: "text",
      localized: true,
      defaultValue: "Request a demo",
    },
    {
      name: "discussProject",
      type: "text",
      localized: true,
      defaultValue: "Discuss your project",
    },
    {
      name: "allProjects",
      type: "text",
      localized: true,
      defaultValue: "All projects",
    },
    {
      name: "previousPage",
      type: "text",
      localized: true,
      defaultValue: "Previous page",
    },
    {
      name: "nextPage",
      type: "text",
      localized: true,
      defaultValue: "Next page",
    },
    {
      name: "backToTop",
      type: "text",
      localized: true,
      defaultValue: "Back to top",
    },
    {
      name: "skipToContent",
      type: "text",
      localized: true,
      defaultValue: "Skip to content",
    },
    {
      name: "changeLanguage",
      type: "text",
      localized: true,
      defaultValue: "Change language",
    },
  ],
}
