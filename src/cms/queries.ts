import { draftMode } from "next/headers"
import { getPayload, type Where } from "payload"
import config from "@/payload.config"
import type { Locale } from "@/content/types"

// Singleton promise for Payload client
let payloadPromise: ReturnType<typeof getPayload> | null = null

async function getPayloadClient() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config }).catch((err) => {
      payloadPromise = null
      throw err
    })
  }
  return payloadPromise
}

export async function isDraftModeEnabled(): Promise<boolean> {
  try {
    const draft = await draftMode()
    return draft.isEnabled
  } catch {
    return false
  }
}

/**
 * Standard published-only query predicate for anonymous requests.
 */
function getWherePublished(extra?: Where, allowDraft = false): Where {
  const publishedClause: Where = { _status: { equals: "published" } }
  if (allowDraft) return extra || {}
  return extra ? ({ and: [publishedClause, extra] } as Where) : publishedClause
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBALS
// ─────────────────────────────────────────────────────────────────────────────

export async function getSiteSettings(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "site-settings",
      locale,
      depth: 1,
    })
  } catch {
    return {
      siteName: "INHERITIX",
      brandColors: {
        primary: "#0066FF",
        accent: "#00CCFF",
        dark: "#060A11",
      },
      defaultSeo: {
        title:
          locale === "ar"
            ? "تصميم متقن. هندسة جادة."
            : "Beautifully designed. Seriously engineered.",
        description:
          locale === "ar"
            ? "تبني Inheritix برمجيات تسهّل إدارة الأعمال المعقدة ومنتجات رقمية يستمتع الناس باستخدامها."
            : "Inheritix builds software that makes complex businesses easier to run and digital products people enjoy using.",
      },
      footerHeading:
        locale === "ar" ? "لديك مشروع في ذهنك؟" : "Have a project in mind?",
      footerInvitation:
        locale === "ar"
          ? "لنصنع شيئًا يستحق الاستخدام."
          : "Let’s make something worth using.",
      footerCtaLabel:
        locale === "ar"
          ? "حدثنا عما تريد بناءه"
          : "Tell us what you’re building",
      copyright: "INHERITIX Technologies",
      location: locale === "ar" ? "عمان، الأردن" : "Amman, Jordan",
    }
  }
}

export async function getNavigation(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "navigation",
      locale,
      depth: 1,
    })
  } catch {
    return {
      items: [
        { label: locale === "ar" ? "الخدمات" : "Services", href: "/services" },
        { label: locale === "ar" ? "المنتجات" : "Products", href: "/products" },
        { label: locale === "ar" ? "المشاريع" : "Projects", href: "/projects" },
        { label: locale === "ar" ? "عن الشركة" : "About", href: "/about" },
        { label: locale === "ar" ? "الرؤى" : "Insights", href: "/insights" },
        { label: locale === "ar" ? "تواصل معنا" : "Contact", href: "/contact" },
      ],
      headerCta: {
        label: locale === "ar" ? "ابدأ مشروعك" : "Start a Project",
        href: "/contact",
      },
    }
  }
}

export async function getHomePage(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "page-home",
      locale,
      depth: 1,
    })
  } catch {
    return null
  }
}

export async function getAboutPage(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "page-about",
      locale,
      depth: 1,
    })
  } catch {
    return null
  }
}

export async function getContactPage(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "page-contact",
      locale,
      depth: 1,
    })
  } catch {
    return null
  }
}

export async function getListingPages(locale: Locale = "en") {
  try {
    const payload = await getPayloadClient()
    return await payload.findGlobal({
      slug: "listing-pages",
      locale,
      depth: 1,
    })
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublishedServices(locale: Locale = "en") {
  const isDraft = await isDraftModeEnabled()
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "services",
      locale,
      where: getWherePublished(undefined, isDraft),
      sort: "displayOrder",
      limit: 50,
      depth: 1,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs
  } catch {
    // Falls back to fallback list in development
  }

  if (process.env.NODE_ENV === "production") return []

  // Development baseline fallback
  return [
    {
      number: "01",
      slug: "custom-software",
      title: locale === "ar" ? "برمجيات مخصصة" : "Custom software",
      shortDescription:
        locale === "ar"
          ? "أنظمة مصممة خصيصًا لتلائم طريقة عمل شركتك الحقيقية."
          : "Purpose-built systems shaped around the way your business actually works.",
      heroIntro:
        "We design and engineer custom software that reduces friction, creates operational visibility, and is built to evolve with your business.",
      deliverables: [
        { item: "Product and technical strategy" },
        { item: "User journeys and service blueprints" },
        { item: "Interface design and interactive prototypes" },
        { item: "Production engineering and integrations" },
        { item: "Quality assurance and launch support" },
      ],
      displayOrder: 1,
    },
    {
      number: "02",
      slug: "saas-platforms",
      title: locale === "ar" ? "منصات SaaS" : "SaaS platforms",
      shortDescription:
        locale === "ar"
          ? "منتجات قابلة للتوسع مصممة للتبني والاستمرار والتطور المستمر."
          : "Scalable products designed for adoption, retention, and continuous evolution.",
      heroIntro:
        "We design and engineer SaaS platforms that turn complex domain workflows into products users embrace every day.",
      deliverables: [
        { item: "Multi-tenant architecture and security" },
        { item: "Subscription and billing mechanics" },
        { item: "Product analytics and retention telemetry" },
      ],
      displayOrder: 2,
    },
    {
      number: "03",
      slug: "erp-and-business-systems",
      title: locale === "ar" ? "أنظمة ERP وإدارة الأعمال" : "ERP & business systems",
      shortDescription:
        locale === "ar"
          ? "عمليات مترابطة، بيانات واضحة، وتقليل التدخل اليدوي."
          : "Connected operations, clear data, and fewer manual handoffs.",
      heroIntro:
        "Unify disparate operational silos into reliable, real-time enterprise systems.",
      deliverables: [
        { item: "Data schema alignment and migration" },
        { item: "Automated operational reporting" },
        { item: "Role-based permission architecture" },
      ],
      displayOrder: 3,
    },
    {
      number: "04",
      slug: "mobile-applications",
      title: locale === "ar" ? "تطبيقات الجوال" : "Mobile applications",
      shortDescription:
        locale === "ar"
          ? "تجارب أصلية وسريعة للأشخاص أثناء تنقلهم."
          : "Focused native-feeling experiences for people on the move.",
      heroIntro:
        "High-performance iOS and Android digital tools built with responsiveness, offline reliability, and clarity.",
      deliverables: [
        { item: "Native UX design and prototyping" },
        { item: "Offline-first sync architectures" },
      ],
      displayOrder: 4,
    },
    {
      number: "05",
      slug: "ai-automation",
      title: locale === "ar" ? "أتمتة الذكاء الاصطناعي" : "AI automation",
      shortDescription:
        locale === "ar"
          ? "أتمتة عملية للقرارات المتكررة وتدفقات العمل والدعم."
          : "Practical automation for repetitive decisions, workflows, and support.",
      heroIntro:
        "Empower operations with intelligent automation that respects human judgment and domain constraints.",
      deliverables: [
        { item: "Workflow classification and extraction" },
        { item: "Human-in-the-loop review mechanisms" },
      ],
      displayOrder: 5,
    },
    {
      number: "06",
      slug: "wordpress-development",
      title: locale === "ar" ? "تطوير ووردبريس" : "WordPress development",
      shortDescription:
        locale === "ar"
          ? "أنظمة نشر سريعة ومرنة مهندسة لما وراء القوالب الجاهزة."
          : "Fast, flexible publishing systems engineered beyond the template.",
      heroIntro:
        "Bespoke content management engineered with modern performance benchmarks and clean publishing workflows.",
      deliverables: [
        { item: "Custom block-based editorial tools" },
        { item: "Enterprise caching and headless APIs" },
      ],
      displayOrder: 6,
    },
  ] as unknown as Record<string, unknown>[]
}

export async function getServiceBySlug(
  slug: string,
  locale: Locale = "en",
  allowDraft = false,
) {
  const isDraft = allowDraft || (await isDraftModeEnabled())
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "services",
      locale,
      where: getWherePublished({ slug: { equals: slug } }, isDraft),
      limit: 1,
      depth: 1,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs[0]
  } catch {
    // Fall back to development data if present
  }

  if (process.env.NODE_ENV === "production") return null

  const list = await getPublishedServices(locale)
  return list.find((item) => (item as { slug: string }).slug === slug) || null
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublishedProducts(locale: Locale = "en") {
  const isDraft = await isDraftModeEnabled()
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "products",
      locale,
      where: getWherePublished(undefined, isDraft),
      sort: "displayOrder",
      limit: 20,
      depth: 1,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs
  } catch {
    // Fallback in development
  }

  if (process.env.NODE_ENV === "production") return []

  return [
    {
      slug: "logisttex",
      name: "LOGISTTEX",
      badge: "01 / LOGISTICS",
      category: locale === "ar" ? "عمليات لوجستية" : "LOGISTICS OPERATIONS",
      tagline:
        locale === "ar" ? "كل عملية. مرئية." : "Every operation. Visible.",
      summary:
        locale === "ar"
          ? "منصة عمليات لوجستية تحول الشحنات والمركبات والأداء إلى صورة واحدة واضحة."
          : "A logistics operations platform that turns shipments, fleets, and performance into one clear picture.",
      heroHeadline:
        locale === "ar" ? "العمليات اللوجستية تحت السيطرة." : "Logistics, under control.",
      heroDescription:
        locale === "ar"
          ? "نظام تشغيلي واحد للطلبات والأسطول والسائقين والتكاليف والقرارات اليومية."
          : "One operational system for orders, fleets, drivers, costs, and the decisions between them.",
      visualType: "dashboard",
      displayOrder: 1,
      valuePoints: [
        {
          label: "ONE VIEW",
          description: "See the operation as it happens.",
        },
        {
          label: "LESS CHASING",
          description: "Keep teams and drivers coordinated.",
        },
        {
          label: "BETTER SIGNAL",
          description: "Turn activity into useful decisions.",
        },
      ],
      workflowSteps: [
        { stepNumber: "01", name: "Capture" },
        { stepNumber: "02", name: "Plan" },
        { stepNumber: "03", name: "Dispatch" },
        { stepNumber: "04", name: "Track" },
        { stepNumber: "05", name: "Settle" },
      ],
    },
    {
      slug: "fen-el-menu",
      name: "Fen El Menu",
      badge: "02 / HOSPITALITY",
      category: locale === "ar" ? "تجربة المطاعم" : "RESTAURANT EXPERIENCE",
      tagline:
        locale === "ar"
          ? "من القائمة إلى الطلب، بسلاسة."
          : "From menu to order, beautifully.",
      summary:
        locale === "ar"
          ? "طلب رقمي أنيق يبسّط الاختيار ويجعل إدارة القائمة أسرع."
          : "A refined ordering experience that makes choosing simple and menu management faster.",
      heroHeadline:
        locale === "ar"
          ? "طريقة أفضل للتصفح والاختيار والطلب."
          : "A better way to browse, choose, and order.",
      heroDescription:
        locale === "ar"
          ? "تجربة قائمة وطلب مرنة للمطاعم التي تهتم بكل تفصيل."
          : "A flexible digital menu designed to make ordering feel natural—and menu operations feel manageable.",
      visualType: "phone",
      displayOrder: 2,
      valuePoints: [
        {
          label: "EASY CHOICE",
          description: "Readable menus, modifiers, and details.",
        },
        {
          label: "FASTER UPDATES",
          description: "Change items and availability centrally.",
        },
        {
          label: "BRAND-READY",
          description: "An experience that feels like your restaurant.",
        },
      ],
      workflowSteps: [
        { stepNumber: "01", name: "Browse" },
        { stepNumber: "02", name: "Customize" },
        { stepNumber: "03", name: "Review" },
        { stepNumber: "04", name: "Order" },
        { stepNumber: "05", name: "Enjoy" },
      ],
    },
  ] as unknown as Record<string, unknown>[]
}

export async function getProductBySlug(
  slug: string,
  locale: Locale = "en",
  allowDraft = false,
) {
  const isDraft = allowDraft || (await isDraftModeEnabled())
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "products",
      locale,
      where: getWherePublished({ slug: { equals: slug } }, isDraft),
      limit: 1,
      depth: 1,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs[0]
  } catch {
    // Development fallback
  }

  if (process.env.NODE_ENV === "production") return null

  const list = await getPublishedProducts(locale)
  return list.find((item) => (item as { slug: string }).slug === slug) || null
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS (CLIENT WORK)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectQueryOptions {
  filter?: string
  page?: number
  limit?: number
  allowDraft?: boolean
}

export async function getPublishedProjects(
  locale: Locale = "en",
  options: ProjectQueryOptions = {},
) {
  const { filter = "all", page = 1, limit = 12, allowDraft = false } = options
  const isDraft = allowDraft || (await isDraftModeEnabled())

  const whereExtra: Where | undefined =
    filter && filter !== "all" ? { sector: { equals: filter } } : undefined

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "projects",
      locale,
      where: getWherePublished(whereExtra, isDraft),
      sort: "displayOrder",
      page,
      limit,
      depth: 2,
      draft: isDraft,
    })
    return {
      docs: result.docs,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page || 1,
      hasPrevPage: result.hasPrevPage,
      hasNextPage: result.hasNextPage,
    }
  } catch {
    // Fallback during development
  }

  // Strictly return empty in production if DB is empty
  if (process.env.NODE_ENV === "production") {
    return {
      docs: [],
      totalDocs: 0,
      totalPages: 1,
      page: 1,
      hasPrevPage: false,
      hasNextPage: false,
    }
  }

  // Development fixtures
  const { projectFixtures } = await import("@/content/development-fixtures")
  const filtered = projectFixtures.filter((p) => {
    if (filter === "all") return true
    return p.sector.en === filter || p.sector.ar === filter
  })

  return {
    docs: filtered.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title[locale],
      summary: p.summary[locale],
      sector: p.sector[locale],
      services: p.services.map((s) => ({ name: s[locale] })),
      year: p.year,
      cardImage: {
        url: p.cardImage.src,
        alt: p.cardImage.alt[locale],
        width: p.cardImage.width,
        height: p.cardImage.height,
      },
      heroImage: {
        url: p.heroImage.src,
        alt: p.heroImage.alt[locale],
        width: p.heroImage.width,
        height: p.heroImage.height,
      },
      featured: p.featured,
      blocks: p.blocks,
      isDevelopmentFixture: true,
    })),
    totalDocs: filtered.length,
    totalPages: 1,
    page: 1,
    hasPrevPage: false,
    hasNextPage: false,
  }
}

export async function getProjectBySlug(
  slug: string,
  locale: Locale = "en",
  allowDraft = false,
) {
  const isDraft = allowDraft || (await isDraftModeEnabled())
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "projects",
      locale,
      where: getWherePublished({ slug: { equals: slug } }, isDraft),
      limit: 1,
      depth: 2,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs[0]
  } catch {
    // Development fallback
  }

  if (process.env.NODE_ENV === "production") return null

  const { projectFixtures } = await import("@/content/development-fixtures")
  const found = projectFixtures.find((p) => p.slug === slug)
  if (!found) return null

  return {
    id: found.id,
    slug: found.slug,
    title: found.title[locale],
    summary: found.summary[locale],
    sector: found.sector[locale],
    services: found.services.map((s) => ({ name: s[locale] })),
    year: found.year,
    cardImage: {
      url: found.cardImage.src,
      alt: found.cardImage.alt[locale],
      width: found.cardImage.width,
      height: found.cardImage.height,
    },
    heroImage: {
      url: found.heroImage.src,
      alt: found.heroImage.alt[locale],
      width: found.heroImage.width,
      height: found.heroImage.height,
    },
    featured: found.featured,
    blocks: found.blocks,
    relatedProjects: [],
    isDevelopmentFixture: true,
  }
}

export async function getFeaturedProjects(locale: Locale = "en", limit = 3) {
  const isDraft = await isDraftModeEnabled()
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "projects",
      locale,
      where: getWherePublished({ featured: { equals: true } }, isDraft),
      sort: "displayOrder",
      limit,
      depth: 2,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs
  } catch {
    // Development fallback
  }

  if (process.env.NODE_ENV === "production") return []

  const { projectFixtures } = await import("@/content/development-fixtures")
  return projectFixtures.filter((p) => p.featured).slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTS (ARTICLES / INSIGHTS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublishedPosts(locale: Locale = "en", limit = 10) {
  const isDraft = await isDraftModeEnabled()
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "posts",
      locale,
      where: getWherePublished(undefined, isDraft),
      sort: "-publishedAt",
      limit,
      depth: 2,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs
  } catch {
    // Development fallback
  }

  if (process.env.NODE_ENV === "production") return []

  return [
    {
      slug: "software-people-adopt",
      title:
        locale === "ar"
          ? "كيف تبني برمجيات أعمال يعتمد عليها الناس حقًا"
          : "How to build business software people actually adopt",
      categoryLabel: "PRODUCT THINKING",
      readTime: "7 min read",
      color: "ink",
      excerpt:
        "Adoption is not a training problem. It is the accumulated result of product decisions made long before launch.",
    },
    {
      slug: "automation-with-judgment",
      title:
        locale === "ar"
          ? "الأتمتة تحتاج إلى حكمة، وليس مجرد نموذج ذكاء اصطناعي"
          : "Automation needs judgment, not just a model",
      categoryLabel: "AI & AUTOMATION",
      readTime: "6 min read",
      color: "blue",
      excerpt:
        "Practical automation is built around exceptional handling and human verification, not opaque black boxes.",
    },
    {
      slug: "designing-operational-clarity",
      title:
        locale === "ar"
          ? "التصميم لتحقيق الوضوح التشغيلي"
          : "Designing for operational clarity",
      categoryLabel: "DESIGN",
      readTime: "9 min read",
      color: "cyan",
      excerpt:
        "Why visual simplicity alone is insufficient for heavy data systems, and how to structure interfaces around next decisions.",
    },
  ] as unknown as Record<string, unknown>[]
}

export async function getPostBySlug(
  slug: string,
  locale: Locale = "en",
  allowDraft = false,
) {
  const isDraft = allowDraft || (await isDraftModeEnabled())
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "posts",
      locale,
      where: getWherePublished({ slug: { equals: slug } }, isDraft),
      limit: 1,
      depth: 2,
      draft: isDraft,
    })
    if (result.docs.length > 0) return result.docs[0]
  } catch {
    // Development fallback
  }

  if (process.env.NODE_ENV === "production") return null

  const list = await getPublishedPosts(locale)
  return list.find((item) => (item as { slug: string }).slug === slug) || null
}

// ─────────────────────────────────────────────────────────────────────────────
// REDIRECTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRedirectForPath(pathname: string) {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "redirects",
      where: { from: { equals: pathname } },
      limit: 1,
    })
    if (result.docs.length > 0) return result.docs[0]
  } catch {
    // Ignore
  }

  // Built-in rule redirects:
  if (pathname === "/work") return { to: "/projects", statusCode: "308" }
  if (pathname === "/ar/work") return { to: "/ar/projects", statusCode: "308" }
  if (pathname.startsWith("/work/")) {
    return { to: `/projects/${pathname.slice(6)}`, statusCode: "308" }
  }
  if (pathname.startsWith("/ar/work/")) {
    return { to: `/ar/projects/${pathname.slice(9)}`, statusCode: "308" }
  }

  return null
}
