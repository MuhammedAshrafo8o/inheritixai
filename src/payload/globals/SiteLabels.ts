import type { Field, GlobalConfig } from "payload"
import { canManageContent } from "../../cms/access"
import { ARTICLE_CTA_COPY, SITE_LABEL_COPY } from "../../content/starter-copy"
import { revalidateGlobalAfterChange } from "../hooks/revalidate"

/** Localized label with English starter copy as the default. Empty = hidden on the site. */
function label(name: string, defaultValue: string, description?: string): Field {
  return { name, type: "text", localized: true, defaultValue, admin: description ? { description } : undefined }
}

const copy = (name: keyof typeof SITE_LABEL_COPY, description?: string) =>
  label(name, SITE_LABEL_COPY[name].en, description)

export const SiteLabels: GlobalConfig = {
  slug: "site-labels",
  access: {
    read: () => true,
    update: canManageContent,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange],
  },
  admin: {
    description: "Shared visitor-facing labels. Clearing a label hides that element on the website.",
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Buttons & links",
          fields: [
            label("exploreWork", "Explore Our Work"),
            label("startProject", "Start a Project"),
            label("viewProduct", "View product"),
            label("viewProject", "View project"),
            label("explore", "Explore", "Prefix for product links, e.g. “Explore LOGISTTEX”."),
            label("readStory", "Read the story"),
            label("seeService", "See service"),
            label("requestDemo", "Request a demo"),
            label("discussProject", "Discuss your project"),
            label("allProjects", "All projects"),
            label("previousPage", "Previous page"),
            label("nextPage", "Next page"),
          ],
        },
        {
          label: "Navigation & accessibility",
          fields: [
            label("backToTop", "Back to top"),
            label("skipToContent", "Skip to content"),
            label("changeLanguage", "Switch to Arabic", "Screen-reader label of the language switch."),
            copy("languageToggle", "Visible text of the language switch (e.g. العربية on English pages, EN on Arabic pages)."),
            copy("mainNavigation"),
            copy("openMenu"),
            copy("closeMenu"),
          ],
        },
        {
          label: "Projects",
          fields: [
            copy("sector"),
            copy("services"),
            copy("year"),
            copy("technology"),
            copy("visitClientSite"),
            copy("relatedProjectsLabel"),
            copy("relatedProjectsTitle"),
            copy("projectList", "Screen-reader heading of the project grid."),
            copy("filterProjects", "Screen-reader label of the sector filter."),
            copy("projectPages", "Screen-reader label of the pagination."),
            copy("draftPreview", "Shown to signed-in editors on unpublished previews."),
            copy("draftPreviewNote"),
          ],
        },
        {
          label: "Articles",
          fields: [
            copy("contents"),
            copy("moreInsightsLabel"),
            copy("moreInsightsTitle"),
            {
              name: "articleCta",
              type: "group",
              label: "Article call to action",
              fields: [
                {
                  name: "visible",
                  type: "checkbox",
                  localized: true,
                  defaultValue: true,
                  admin: { description: "Show the article call to action for the selected locale." },
                },
                label("eyebrow", ARTICLE_CTA_COPY.eyebrow.en),
                label("title", ARTICLE_CTA_COPY.title.en),
                label("label", ARTICLE_CTA_COPY.label.en),
                {
                  name: "href",
                  type: "text",
                  defaultValue: "/contact",
                  admin: { description: "Site path; /ar is added automatically on Arabic pages." },
                },
              ],
            },
          ],
        },
        {
          label: "Services & products",
          fields: [
            copy("serviceKicker", "Shown before the service number, e.g. “SERVICE 01”."),
            copy("onThisPage"),
            copy("problemNav"),
            copy("deliverablesNav"),
            copy("processNav"),
            copy("nextStepNav"),
            copy("coreWorkflow"),
            copy("interfaceTour"),
            copy("interfaceTourTitle"),
            copy("faq"),
            copy("faqTitle"),
          ],
        },
        {
          label: "Error pages",
          fields: [
            copy("notFoundEyebrow"),
            copy("notFoundTitle"),
            copy("notFoundBody"),
            copy("notFoundLink"),
            copy("errorEyebrow"),
            copy("errorTitle"),
            copy("errorBody"),
            copy("errorRetry"),
          ],
        },
      ],
    },
  ],
}
