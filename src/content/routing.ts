import type { Metadata } from "next"
import { projectFixtures } from "./development-fixtures"
import type { Locale } from "./types"

const serviceSlugs = new Set([
  "custom-software",
  "saas-platforms",
  "erp-and-business-systems",
  "mobile-applications",
  "ai-automation",
  "wordpress-development",
])

const insightSlugs = new Set([
  "software-people-adopt",
  "automation-with-judgment",
  "designing-operational-clarity",
])

const fixedPaths = new Set([
  "/",
  "/services",
  "/products",
  "/products/logisttex",
  "/products/fen-el-menu",
  "/projects",
  "/about",
  "/insights",
  "/contact",
])

export function routeFromSegments(segments?: string[]) {
  return segments?.length ? `/${segments.join("/")}` : "/"
}

export function isSupportedPublicPath(path: string) {
  if (fixedPaths.has(path)) return true
  if (path.startsWith("/services/")) return serviceSlugs.has(path.slice(10))
  if (path.startsWith("/insights/")) return insightSlugs.has(path.slice(10))
  if (path.startsWith("/projects/")) {
    return projectFixtures.some((project) => project.slug === path.slice(10))
  }
  return false
}

const pageMeta: Record<
  string,
  { title: Record<Locale, string>; description: Record<Locale, string> }
> = {
  "/": {
    title: {
      en: "Beautifully designed. Seriously engineered.",
      ar: "تصميم متقن. هندسة جادة.",
    },
    description: {
      en: "Inheritix builds software that makes complex businesses easier to run and digital products people enjoy using.",
      ar: "تبني Inheritix برمجيات تسهّل إدارة الأعمال المعقدة ومنتجات رقمية يستمتع الناس باستخدامها.",
    },
  },
  "/services": {
    title: { en: "Services", ar: "الخدمات" },
    description: {
      en: "Custom software, SaaS, ERP, mobile applications, AI automation, and WordPress engineering.",
      ar: "برمجيات مخصصة ومنصات SaaS وأنظمة ERP وتطبيقات جوال وأتمتة بالذكاء الاصطناعي وتطوير WordPress.",
    },
  },
  "/products": {
    title: { en: "Products", ar: "المنتجات" },
    description: {
      en: "Explore digital products designed and engineered by Inheritix.",
      ar: "استكشف المنتجات الرقمية التي تصممها وتهندسها Inheritix.",
    },
  },
  "/projects": {
    title: { en: "Projects", ar: "المشاريع" },
    description: {
      en: "Project layouts prepared for approved Inheritix client work.",
      ar: "تخطيطات مشاريع جاهزة لأعمال عملاء Inheritix المعتمدة.",
    },
  },
  "/about": {
    title: { en: "About", ar: "عن الشركة" },
    description: {
      en: "Meet the design and engineering perspective behind Inheritix.",
      ar: "تعرّف على منظور التصميم والهندسة وراء Inheritix.",
    },
  },
  "/insights": {
    title: { en: "Insights", ar: "الرؤى" },
    description: {
      en: "Notes on product thinking, design, engineering, and digital operations.",
      ar: "ملاحظات حول تفكير المنتجات والتصميم والهندسة والعمليات الرقمية.",
    },
  },
  "/contact": {
    title: { en: "Contact", ar: "تواصل معنا" },
    description: {
      en: "Tell Inheritix about your product, platform, or software challenge.",
      ar: "حدّث Inheritix عن منتجك أو منصتك أو تحدي البرمجيات لديك.",
    },
  },
}

function genericMeta(path: string, locale: Locale) {
  if (path.startsWith("/services/")) {
    return {
      title: locale === "ar" ? "تفاصيل الخدمة" : "Service details",
      description:
        locale === "ar"
          ? "نهج Inheritix لتصميم وهندسة البرمجيات."
          : "The Inheritix approach to software design and engineering.",
    }
  }
  if (path.startsWith("/products/")) {
    return {
      title: locale === "ar" ? "تفاصيل المنتج" : "Product details",
      description:
        locale === "ar"
          ? "منتج رقمي من تصميم وهندسة Inheritix."
          : "A digital product designed and engineered by Inheritix.",
    }
  }
  return {
    title: locale === "ar" ? "رؤى Inheritix" : "Inheritix insight",
    description:
      locale === "ar"
        ? "أفكار حول بناء منتجات وبرمجيات رقمية أفضل."
        : "Thinking about better digital products and software.",
  }
}

export function metadataForPath(path: string, locale: Locale): Metadata {
  const project = path.startsWith("/projects/")
    ? projectFixtures.find((item) => item.slug === path.slice(10))
    : undefined
  const resolved = project
    ? { title: project.seo.title[locale], description: project.seo.description[locale] }
    : pageMeta[path]
      ? {
          title: pageMeta[path].title[locale],
          description: pageMeta[path].description[locale],
        }
      : genericMeta(path, locale)
  const english = path
  const arabic = `/ar${path === "/" ? "" : path}`
  const canonical = locale === "ar" ? arabic : english

  return {
    title: resolved.title,
    description: resolved.description,
    alternates: {
      canonical,
      languages: {
        en: english,
        ar: arabic,
        "x-default": english,
      },
    },
    robots: project?.seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      locale: locale === "ar" ? "ar_JO" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_JO"],
      url: canonical,
      siteName: "Inheritix",
      type: "website",
    },
  }
}
