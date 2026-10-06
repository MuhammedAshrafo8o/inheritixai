/**
 * Idempotent content seed for Inheritix milestone two.
 *
 *   npm run seed          (runs through `payload run`, which loads .env / .env.local)
 *
 * Guarantees:
 * - Never creates users or prints credentials (use `npm run bootstrap:users`).
 * - Never overwrites editorial changes: collection records are created only when
 *   their slug is missing, and a global is initialised only if it has never been
 *   saved. Re-running the seed is a no-op for anything that already exists.
 * - Approved content (services, products, one complete article) is published;
 *   unapproved sample projects and incomplete articles are saved as drafts.
 * - Any failure aborts with a non-zero exit code. Nothing is swallowed.
 */
import path from "node:path"
import { getPayload, type Payload } from "payload"
import config from "../src/payload.config"
import { lexicalDocument } from "../src/cms/lexical"
import { projectFixtures } from "../src/content/development-fixtures"
import {
  ARTICLE_CTA_COPY,
  CONTACT_FORM_COPY,
  LISTING_COPY,
  PRODUCT_SECTION_COPY,
  SERVICE_SECTION_COPY,
  SITE_LABEL_COPY,
  arabicOf,
  englishOf,
} from "../src/content/starter-copy"

type Locale = "en" | "ar"
type Bilingual = Record<Locale, string>

const context = { disableRevalidate: true }
const summary = { created: [] as string[], kept: [] as string[] }

let payload: Payload

function describeDatabase() {
  try {
    const url = new URL(process.env.DATABASE_URI ?? "")
    return `${url.hostname}:${url.port || 5432}${url.pathname}`
  } catch {
    return "(unparseable DATABASE_URI)"
  }
}

async function findOneBy(collection: "services" | "products" | "posts" | "projects" | "categories" | "clients", field: string, value: string) {
  const result = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  return result.docs[0] as { id: number } | undefined
}

/** Initialise a global only when it has never been saved. */
async function initGlobal<T extends Record<string, unknown>>(
  slug: Parameters<Payload["updateGlobal"]>[0]["slug"],
  en: T,
  ar?: (saved: Record<string, any>) => Record<string, unknown>,
) {
  const existing = (await payload.db.findGlobal({ slug })) as { id?: unknown }
  if (existing?.id) {
    summary.kept.push(`global:${slug}`)
    return
  }
  const saved = await payload.updateGlobal({ slug, data: en as never, locale: "en", context })
  if (ar) {
    await payload.updateGlobal({ slug, data: ar(saved as Record<string, any>) as never, locale: "ar", context })
  }
  summary.created.push(`global:${slug}`)
}

/** Map Arabic values onto saved array rows (keeps row ids so locales align). */
function localizeRows<R extends { id?: string | null }>(rows: R[] | null | undefined, values: Array<Record<string, unknown>>) {
  return (rows ?? []).map((row, index) => ({ ...row, ...(values[index] ?? {}) }))
}

async function ensureMedia(file: string, alt: Bilingual, description?: Bilingual) {
  const filename = path.basename(file)
  const existing = await payload.find({
    collection: "media",
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.docs[0]) return existing.docs[0].id as number
  const created = await payload.create({
    collection: "media",
    data: { alt: alt.en, description: description?.en },
    filePath: path.resolve(process.cwd(), file),
    locale: "en",
    context,
  })
  await payload.update({
    collection: "media",
    id: created.id,
    data: { alt: alt.ar, description: description?.ar },
    locale: "ar",
    context,
  })
  summary.created.push(`media:${filename}`)
  return created.id as number
}

// ─── Users: never created here ──────────────────────────────────────────────

async function checkAdministrators() {
  const admins = await payload.count({
    collection: "users",
    where: { roles: { contains: "admin" } },
    overrideAccess: true,
  })
  if (admins.totalDocs === 0) {
    console.warn(
      "  ! No administrator exists yet. Run `npm run bootstrap:users` (credentials are read from the environment or prompted, never defaulted).",
    )
  }
}

// ─── Taxonomy & authors ─────────────────────────────────────────────────────

const categoryDefs = [
  { slug: "product-thinking", name: { en: "Product Thinking", ar: "التفكير في المنتج" } },
  { slug: "ai-and-automation", name: { en: "AI & Automation", ar: "الذكاء الاصطناعي والأتمتة" } },
  { slug: "design", name: { en: "Design", ar: "التصميم" } },
]

async function seedCategories() {
  const ids = new Map<string, number>()
  for (const cat of categoryDefs) {
    const existing = await findOneBy("categories", "slug", cat.slug)
    if (existing) {
      ids.set(cat.slug, existing.id)
      summary.kept.push(`category:${cat.slug}`)
      continue
    }
    const created = await payload.create({
      collection: "categories",
      data: { slug: cat.slug, name: cat.name.en },
      locale: "en",
      context,
    })
    await payload.update({ collection: "categories", id: created.id, data: { name: cat.name.ar }, locale: "ar", context })
    ids.set(cat.slug, created.id as number)
    summary.created.push(`category:${cat.slug}`)
  }
  return ids
}

async function seedAuthor() {
  const existing = await payload.find({
    collection: "authors",
    where: { name: { equals: "INHERITIX Editorial" } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    summary.kept.push("author:INHERITIX Editorial")
    return existing.docs[0].id as number
  }
  const created = await payload.create({
    collection: "authors",
    data: {
      name: "INHERITIX Editorial",
      initials: "IN",
      role: "INHERITIX Editorial",
      bio: "Designers and engineers writing on product strategy, interface design, and software craftsmanship.",
    },
    locale: "en",
    context,
  })
  await payload.update({
    collection: "authors",
    id: created.id,
    data: {
      role: "فريق تحرير INHERITIX",
      bio: "مصممون ومهندسون يكتبون عن استراتيجية المنتجات وتصميم الواجهات وإتقان البرمجيات.",
    },
    locale: "ar",
    context,
  })
  summary.created.push("author:INHERITIX Editorial")
  return created.id as number
}

// ─── Services (approved, published) ─────────────────────────────────────────

const serviceDefs = [
  {
    number: "01",
    slug: "custom-software",
    title: { en: "Custom software", ar: "برمجيات مخصصة" },
    shortDescription: {
      en: "Purpose-built systems shaped around the way your business actually works.",
      ar: "أنظمة مصممة خصيصًا لتلائم طريقة عمل شركتك الحقيقية.",
    },
    heroIntro: {
      en: "We design and engineer custom software that reduces friction, creates operational visibility, and is built to evolve with your business.",
      ar: "نصمم ونهندس برمجيات مخصصة تقلل الاحتكاك وتمنح وضوحًا تشغيليًا وتُبنى لتتطور مع أعمالك.",
    },
    deliverables: [
      { en: "Product and technical strategy", ar: "استراتيجية المنتج والتقنية" },
      { en: "User journeys and service blueprints", ar: "رحلات المستخدم ومخططات الخدمة" },
      { en: "Interface design and interactive prototypes", ar: "تصميم الواجهات والنماذج التفاعلية" },
      { en: "Production engineering and integrations", ar: "الهندسة الإنتاجية والتكاملات" },
      { en: "Quality assurance and launch support", ar: "ضمان الجودة ودعم الإطلاق" },
    ],
  },
  {
    number: "02",
    slug: "saas-platforms",
    title: { en: "SaaS platforms", ar: "منصات SaaS" },
    shortDescription: {
      en: "Scalable products designed for adoption, retention, and continuous evolution.",
      ar: "منتجات قابلة للتوسع مصممة للتبني والاستمرار والتطور المستمر.",
    },
    heroIntro: {
      en: "We design and engineer SaaS platforms that turn complex domain workflows into products users embrace every day.",
      ar: "نصمم ونهندس منصات SaaS تحوّل سير العمل المعقد إلى منتجات يعتمد عليها المستخدمون كل يوم.",
    },
    deliverables: [
      { en: "Multi-tenant architecture and security", ar: "بنية متعددة المستأجرين وأمان" },
      { en: "Subscription and billing mechanics", ar: "آليات الاشتراك والفوترة" },
      { en: "Product analytics and retention telemetry", ar: "تحليلات المنتج وقياس الاستبقاء" },
      { en: "High-performance design system", ar: "نظام تصميم عالي الأداء" },
    ],
  },
  {
    number: "03",
    slug: "erp-and-business-systems",
    title: { en: "ERP & business systems", ar: "أنظمة ERP وإدارة الأعمال" },
    shortDescription: {
      en: "Connected operations, clear data, and fewer manual handoffs.",
      ar: "عمليات مترابطة، بيانات واضحة، وتقليل التدخل اليدوي.",
    },
    heroIntro: {
      en: "Unify disparate operational silos into reliable, real-time enterprise systems.",
      ar: "وحّد الجزر التشغيلية المتفرقة في أنظمة مؤسسية موثوقة تعمل في الوقت الفعلي.",
    },
    deliverables: [
      { en: "Data schema alignment and migration", ar: "مواءمة هياكل البيانات وترحيلها" },
      { en: "Automated operational reporting", ar: "تقارير تشغيلية مؤتمتة" },
      { en: "Role-based permission architecture", ar: "بنية صلاحيات قائمة على الأدوار" },
    ],
  },
  {
    number: "04",
    slug: "mobile-applications",
    title: { en: "Mobile applications", ar: "تطبيقات الجوال" },
    shortDescription: {
      en: "Focused native-feeling experiences for people on the move.",
      ar: "تجارب أصلية وسريعة للأشخاص أثناء تنقلهم.",
    },
    heroIntro: {
      en: "High-performance iOS and Android digital tools built with responsiveness, offline reliability, and clarity.",
      ar: "أدوات رقمية عالية الأداء لنظامي iOS وAndroid مبنية على الاستجابة والموثوقية دون اتصال والوضوح.",
    },
    deliverables: [
      { en: "Native UX design and prototyping", ar: "تصميم تجربة أصلية ونماذج أولية" },
      { en: "Offline-first sync architectures", ar: "بنى مزامنة تعمل دون اتصال أولًا" },
      { en: "Device sensor and location integrations", ar: "تكامل مستشعرات الجهاز والموقع" },
    ],
  },
  {
    number: "05",
    slug: "ai-automation",
    title: { en: "AI automation", ar: "أتمتة الذكاء الاصطناعي" },
    shortDescription: {
      en: "Practical automation for repetitive decisions, workflows, and support.",
      ar: "أتمتة عملية للقرارات المتكررة وتدفقات العمل والدعم.",
    },
    heroIntro: {
      en: "Empower operations with intelligent automation that respects human judgment and domain constraints.",
      ar: "عزّز العمليات بأتمتة ذكية تحترم الحكم البشري وقيود المجال.",
    },
    deliverables: [
      { en: "Workflow classification and extraction", ar: "تصنيف سير العمل واستخراج البيانات" },
      { en: "Human-in-the-loop review mechanisms", ar: "آليات مراجعة بمشاركة بشرية" },
      { en: "Predictive routing and decision engines", ar: "محركات توجيه وقرارات تنبؤية" },
    ],
  },
  {
    number: "06",
    slug: "wordpress-development",
    title: { en: "WordPress development", ar: "تطوير ووردبريس" },
    shortDescription: {
      en: "Fast, flexible publishing systems engineered beyond the template.",
      ar: "أنظمة نشر سريعة ومرنة مهندسة لما وراء القوالب الجاهزة.",
    },
    heroIntro: {
      en: "Bespoke content management engineered with modern performance benchmarks and clean publishing workflows.",
      ar: "إدارة محتوى مصممة خصيصًا وفق معايير أداء حديثة وسير نشر واضح.",
    },
    deliverables: [
      { en: "Custom block-based editorial tools", ar: "أدوات تحرير مخصصة قائمة على الكتل" },
      { en: "Enterprise caching and headless APIs", ar: "تخزين مؤقت مؤسسي وواجهات برمجية مستقلة" },
      { en: "High-speed Core Web Vitals optimization", ar: "تحسين سريع لمؤشرات أداء الويب الأساسية" },
    ],
  },
]

async function seedServices() {
  for (const [index, s] of serviceDefs.entries()) {
    if (await findOneBy("services", "slug", s.slug)) {
      summary.kept.push(`service:${s.slug}`)
      continue
    }
    const created = await payload.create({
      collection: "services",
      data: {
        number: s.number,
        slug: s.slug,
        title: s.title.en,
        shortDescription: s.shortDescription.en,
        heroIntro: s.heroIntro.en,
        ...englishOf(SERVICE_SECTION_COPY),
        deliverables: s.deliverables.map((d) => ({ item: d.en })),
        displayOrder: index + 1,
        _status: "published",
      },
      locale: "en",
      context,
    })
    await payload.update({
      collection: "services",
      id: created.id,
      data: {
        title: s.title.ar,
        shortDescription: s.shortDescription.ar,
        heroIntro: s.heroIntro.ar,
        problemEyebrow: "المشكلة",
        ...arabicOf(SERVICE_SECTION_COPY),
        deliverablesEyebrow: "ما نقدمه",
        processEyebrow: "طريقة عملنا",
        nextEyebrow: "الخطوة التالية",
        deliverables: localizeRows(created.deliverables, s.deliverables.map((d) => ({ item: d.ar }))),
        _status: "published",
      },
      locale: "ar",
      context,
    })
    summary.created.push(`service:${s.slug} (published)`)
  }
}

// ─── Products (approved, published) ─────────────────────────────────────────

const productDefs = [
  {
    slug: "logisttex",
    name: "LOGISTTEX",
    badge: "01 / LOGISTICS",
    visualType: "dashboard" as const,
    category: { en: "LOGISTICS OPERATIONS", ar: "عمليات لوجستية" },
    tagline: { en: "Every operation. Visible.", ar: "كل عملية. مرئية." },
    summary: {
      en: "A logistics operations platform that turns shipments, fleets, and performance into one clear picture.",
      ar: "منصة عمليات لوجستية تحول الشحنات والمركبات والأداء إلى صورة واحدة واضحة.",
    },
    homeDescription: {
      en: "Coordinate orders, fleet, drivers, and billing from one operational workspace.",
      ar: "تنسيق الطلبات والأسطول والسائقين والفواتير من مساحة تشغيل واحدة.",
    },
    heroHeadline: { en: "Logistics, under control.", ar: "العمليات اللوجستية تحت السيطرة." },
    heroDescription: {
      en: "One operational system for orders, fleets, drivers, costs, and the decisions between them.",
      ar: "نظام تشغيلي واحد للطلبات والأسطول والسائقين والتكاليف والقرارات اليومية.",
    },
    valuePoints: [
      { label: { en: "ONE VIEW", ar: "رؤية واحدة" }, description: { en: "See the operation as it happens.", ar: "شاهد العملية فور حدوثها." } },
      { label: { en: "LESS CHASING", ar: "متابعة أقل" }, description: { en: "Keep teams and drivers coordinated.", ar: "حافظ على تناغم الفِرق والسائقين." } },
      { label: { en: "BETTER SIGNAL", ar: "مؤشرات أوضح" }, description: { en: "Turn activity into useful decisions.", ar: "حوّل النشاط اليومي إلى قرارات مفيدة." } },
    ],
    workflowSteps: [
      { en: "Capture", ar: "استلام" },
      { en: "Plan", ar: "تخطيط" },
      { en: "Dispatch", ar: "توجيه" },
      { en: "Track", ar: "تتبع" },
      { en: "Settle", ar: "تسوية" },
    ],
    faqs: [
      {
        question: { en: "Who is LOGISTTEX for?", ar: "لمن صُممت منصة LOGISTTEX؟" },
        answer: {
          en: "It is designed for growing teams that need a clearer, more dependable digital workflow.",
          ar: "صُممت للفِرق النامية التي تحتاج إلى سير عمل رقمي أكثر وضوحًا وموثوقية.",
        },
      },
      {
        question: { en: "Can it fit our current workflow?", ar: "هل يمكن للمنصة التوافق مع سير عملنا الحالي؟" },
        answer: {
          en: "The product is configurable. We begin with a short discovery session, then show how it can support your current operation and priorities.",
          ar: "المنتج مرن وقابل للتخصيص. نبدأ بجلسة استكشافية، ثم نوضح كيف يدعم أولوياتك الحالية.",
        },
      },
    ],
  },
  {
    slug: "fen-el-menu",
    name: "Fen El Menu",
    badge: "02 / HOSPITALITY",
    visualType: "phone" as const,
    category: { en: "RESTAURANT EXPERIENCE", ar: "تجربة المطاعم" },
    tagline: { en: "From menu to order, beautifully.", ar: "من القائمة إلى الطلب، بسلاسة." },
    summary: {
      en: "A refined ordering experience that makes choosing simple and menu management faster.",
      ar: "طلب رقمي أنيق يبسّط الاختيار ويجعل إدارة القائمة أسرع.",
    },
    homeDescription: {
      en: "A flexible menu and ordering experience for restaurants that care about every detail.",
      ar: "تجربة قائمة وطلب مرنة للمطاعم التي تهتم بكل تفصيل.",
    },
    heroHeadline: { en: "A better way to browse, choose, and order.", ar: "طريقة أفضل للتصفح والاختيار والطلب." },
    heroDescription: {
      en: "A flexible digital menu designed to make ordering feel natural—and menu operations feel manageable.",
      ar: "تجربة قائمة وطلب مرنة للمطاعم التي تهتم بكل تفصيل.",
    },
    valuePoints: [
      { label: { en: "EASY CHOICE", ar: "اختيار سهل" }, description: { en: "Readable menus, modifiers, and details.", ar: "قوائم واضحة وتفاصيل سهلة القراءة." } },
      { label: { en: "FASTER UPDATES", ar: "تحديثات أسرع" }, description: { en: "Change items and availability centrally.", ar: "تعديل العناصر والتوافر مركزيًا بسرعة." } },
      { label: { en: "BRAND-READY", ar: "جاهز لهويتك" }, description: { en: "An experience that feels like your restaurant.", ar: "تجربة تعكس روح مطعمك وهويته." } },
    ],
    workflowSteps: [
      { en: "Browse", ar: "تصفح" },
      { en: "Customize", ar: "تخصيص" },
      { en: "Review", ar: "مراجعة" },
      { en: "Order", ar: "طلب" },
      { en: "Enjoy", ar: "استمتاع" },
    ],
    faqs: [
      {
        question: { en: "What kind of restaurants is it for?", ar: "ما نوع المطاعم التي يناسبها Fen El Menu؟" },
        answer: {
          en: "It is designed for quality-focused restaurants looking to provide guests with an effortless, modern dining journey.",
          ar: "يناسب المطاعم ومجموعات الضيافة التي تسعى لتجربة طلب راقية وسريعة لضيوفها.",
        },
      },
    ],
  },
]

async function seedProducts() {
  for (const [index, p] of productDefs.entries()) {
    if (await findOneBy("products", "slug", p.slug)) {
      summary.kept.push(`product:${p.slug}`)
      continue
    }
    const created = await payload.create({
      collection: "products",
      data: {
        slug: p.slug,
        name: p.name,
        badge: p.badge,
        visualType: p.visualType,
        displayOrder: index + 1,
        category: p.category.en,
        tagline: p.tagline.en,
        summary: p.summary.en,
        homeDescription: p.homeDescription.en,
        ...englishOf(PRODUCT_SECTION_COPY[p.visualType]),
        heroHeadline: p.heroHeadline.en,
        heroDescription: p.heroDescription.en,
        valuePoints: p.valuePoints.map((v) => ({ label: v.label.en, description: v.description.en })),
        workflowSteps: p.workflowSteps.map((w, i) => ({ stepNumber: String(i + 1).padStart(2, "0"), name: w.en })),
        faqs: p.faqs.map((f) => ({ question: f.question.en, answer: f.answer.en })),
        _status: "published",
      },
      locale: "en",
      context,
    })
    await payload.update({
      collection: "products",
      id: created.id,
      data: {
        category: p.category.ar,
        tagline: p.tagline.ar,
        summary: p.summary.ar,
        homeDescription: p.homeDescription.ar,
        ...arabicOf(PRODUCT_SECTION_COPY[p.visualType]),
        heroHeadline: p.heroHeadline.ar,
        heroDescription: p.heroDescription.ar,
        valuePoints: localizeRows(created.valuePoints, p.valuePoints.map((v) => ({ label: v.label.ar, description: v.description.ar }))),
        workflowSteps: localizeRows(created.workflowSteps, p.workflowSteps.map((w) => ({ name: w.ar }))),
        faqs: localizeRows(created.faqs, p.faqs.map((f) => ({ question: f.question.ar, answer: f.answer.ar }))),
        _status: "published",
      },
      locale: "ar",
      context,
    })
    summary.created.push(`product:${p.slug} (published)`)
  }
}

// ─── Articles ───────────────────────────────────────────────────────────────

const articleDefs = [
  {
    slug: "software-people-adopt",
    status: "published" as const,
    title: "How to build business software people actually adopt",
    categorySlug: "product-thinking",
    categoryLabel: "PRODUCT THINKING",
    readTime: "7 min read",
    color: "ink" as const,
    publishedAt: "2026-09-18T09:00:00.000Z",
    excerpt:
      "Adoption is not a training problem. It is the accumulated result of product decisions made long before launch.",
    leadParagraph:
      "Teams do not resist new software because they dislike change. They resist software that asks them to carry more complexity than it removes.",
    coverLabel: "USE",
    coverSubtext: "FUL",
    seo: {
      title: "Business software people actually adopt",
      description:
        "Why adoption is decided by product decisions long before launch — and the four habits that make operational software stick.",
    },
    sections: [
      {
        sectionId: "friction",
        heading: "Start with the friction people already feel",
        body: [
          "The first version of a product brief is often a list of features. But features are only hypotheses. Begin instead with specific moments: the dispatcher who calls three people to locate an order, or the manager reconciling two exports before every meeting.",
          { strong: "Write the moment down.", rest: " A sentence that names who is blocked, when, and what it costs is worth more than a page of feature ideas." },
        ],
        quote: "Useful software creates a shorter, clearer path between intent and outcome.",
      },
      {
        sectionId: "workflow",
        heading: "Design the whole workflow, not isolated screens",
        body: [
          "A polished screen can still fail inside a broken sequence. Map where information enters, who changes it, what decisions depend on it, and where the workflow leaves the product.",
          { list: ["Where does the data originate?", "Who is allowed to change it?", "Which decision waits on it?"] },
        ],
      },
      {
        sectionId: "trust",
        heading: "Earn trust in small moments",
        body: [
          "Trust grows from predictable behavior: clear states, reversible actions, useful validation, and language that matches how the team speaks. Reliability is experienced through details.",
        ],
      },
      {
        sectionId: "measure",
        heading: "Measure behavior, not launch",
        body: [
          "Launch is the beginning of evidence. Look at completion, workarounds, abandonment, repeated support questions, and the time between key steps. Each reveals where the product still asks too much.",
        ],
      },
    ],
  },
  {
    // Incomplete draft: a single section — kept unpublished until an editor finishes it.
    slug: "automation-with-judgment",
    status: "draft" as const,
    title: "Automation needs judgment, not just a model",
    categorySlug: "ai-and-automation",
    categoryLabel: "AI & AUTOMATION",
    readTime: "6 min read",
    color: "blue" as const,
    excerpt:
      "Practical automation is built around exceptional handling and human verification, not opaque black boxes.",
    leadParagraph:
      "Successful AI implementation in operations starts where high volume and routine decisions meet clear domain boundaries.",
    sections: [
      {
        sectionId: "boundaries",
        heading: "Establish explicit decision boundaries",
        body: [
          "Define with clarity when the system should execute autonomously and when an anomaly must trigger escalation to senior operators.",
        ],
      },
    ],
  },
  {
    slug: "designing-operational-clarity",
    status: "draft" as const,
    title: "Designing for operational clarity",
    categorySlug: "design",
    categoryLabel: "DESIGN",
    readTime: "9 min read",
    color: "cyan" as const,
    excerpt:
      "Why visual simplicity alone is insufficient for heavy data systems, and how to structure interfaces around next decisions.",
    leadParagraph:
      "Clarity is measured by how quickly an operator can verify status and choose the appropriate next step under pressure.",
    sections: [
      {
        sectionId: "hierarchy",
        heading: "Hierarchy reflects consequence, not visual convenience",
        body: [
          "Information with immediate operational impact must never compete with background telemetry or static configuration.",
        ],
      },
    ],
  },
]

async function seedArticles(categories: Map<string, number>, authorId: number) {
  for (const art of articleDefs) {
    if (await findOneBy("posts", "slug", art.slug)) {
      summary.kept.push(`post:${art.slug}`)
      continue
    }
    await payload.create({
      collection: "posts",
      data: {
        slug: art.slug,
        title: art.title,
        category: categories.get(art.categorySlug) ?? null,
        categoryLabel: art.categoryLabel,
        author: authorId,
        readTime: art.readTime,
        color: art.color,
        publishedAt: "publishedAt" in art ? art.publishedAt : undefined,
        excerpt: art.excerpt,
        leadParagraph: art.leadParagraph,
        ...("coverLabel" in art ? { coverLabel: art.coverLabel, coverSubtext: art.coverSubtext } : {}),
        sections: art.sections.map((section) => ({
          sectionId: section.sectionId,
          heading: section.heading,
          body: lexicalDocument(section.body) as never,
          quote: "quote" in section ? section.quote : undefined,
        })),
        ...("seo" in art ? { seo: art.seo } : {}),
        _status: art.status,
      },
      draft: art.status === "draft",
      locale: "en",
      context,
    })
    summary.created.push(`post:${art.slug} (${art.status})`)
  }
}

// ─── Sample projects (unapproved → drafts only) ─────────────────────────────

async function seedSampleProjects() {
  const missing = []
  for (const fixture of projectFixtures) {
    if (await findOneBy("projects", "slug", fixture.slug)) summary.kept.push(`project:${fixture.slug}`)
    else missing.push(fixture)
  }
  if (missing.length === 0) return

  let client = await findOneBy("clients", "name", "Sample client (unapproved)")
  if (!client) {
    const logo = await ensureMedia(
      "public/project-fixtures/operations-platform.svg",
      { en: "Sample client mark", ar: "شعار عميل تجريبي" },
    )
    const created = await payload.create({
      collection: "clients",
      data: {
        name: "Sample client (unapproved)",
        logo,
        logoDescription: "Placeholder mark for development layouts — not a real client.",
      },
      locale: "en",
      context,
    })
    await payload.update({
      collection: "clients",
      id: created.id,
      data: { logoDescription: "شعار مؤقت لتخطيطات التطوير — ليس عميلًا حقيقيًا." },
      locale: "ar",
      context,
    })
    client = created as { id: number }
    summary.created.push("client:Sample client (unapproved)")
  }

  for (const fixture of missing) {
    const card = await ensureMedia(`public${fixture.cardImage.src}`, fixture.cardImage.alt, fixture.cardImage.description)
    const blocksFor = (locale: Locale) =>
      fixture.blocks.map((block) => {
        switch (block.blockType) {
          case "intro":
            return { blockType: "intro", eyebrow: block.eyebrow?.[locale], heading: block.heading[locale], body: block.body[locale] }
          case "metrics":
            return { blockType: "metrics", items: block.items.map((item) => ({ value: item.value[locale], label: item.label[locale] })) }
          case "richText":
            return {
              blockType: "richText",
              heading: block.heading?.[locale],
              body: lexicalDocument([block.body[locale]], locale === "ar" ? "rtl" : "ltr"),
            }
          case "cta":
            return {
              blockType: "cta",
              heading: block.heading[locale],
              body: block.body?.[locale],
              actionLabel: block.action.label[locale],
              actionHref: block.action.href[locale],
            }
          default:
            throw new Error(`Unsupported fixture block ${block.blockType}`)
        }
      })

    const created = await payload.create({
      collection: "projects",
      data: {
        slug: fixture.slug,
        title: fixture.title.en,
        client: client.id,
        summary: fixture.summary.en,
        sector: fixture.sector.en,
        year: fixture.year,
        services: fixture.services.map((s) => ({ name: s.en })),
        cardImage: card,
        heroImage: card,
        featured: fixture.featured,
        blocks: blocksFor("en") as never,
        seo: { title: fixture.seo.title.en, description: fixture.seo.description.en, noIndex: true },
        _status: "draft",
      },
      draft: true,
      locale: "en",
      context,
    })

    // Arabic: block rows must keep their ids so both locales share one structure.
    const enBlocks = (created.blocks ?? []) as Array<Record<string, any>>
    const arBlocks = blocksFor("ar").map((block, i) => {
      const base = enBlocks[i] ?? {}
      const merged: Record<string, any> = { ...base, ...block, id: base.id }
      if (block.blockType === "metrics") {
        merged.items = localizeRows(base.items, (block as { items: Array<Record<string, unknown>> }).items)
      }
      return merged
    })
    await payload.update({
      collection: "projects",
      id: created.id,
      data: {
        title: fixture.title.ar,
        summary: fixture.summary.ar,
        sector: fixture.sector.ar,
        services: localizeRows(created.services, fixture.services.map((s) => ({ name: s.ar }))),
        blocks: arBlocks as never,
        seo: { title: fixture.seo.title.ar, description: fixture.seo.description.ar, noIndex: true },
        _status: "draft",
      },
      draft: true,
      locale: "ar",
      context,
    })
    summary.created.push(`project:${fixture.slug} (draft, unapproved sample)`)
  }
}

// ─── Globals (initialised once, never overwritten) ──────────────────────────

async function seedGlobals() {
  await initGlobal(
    "site-settings",
    {
      siteName: "INHERITIX",
      brandColors: { primary: "#0178B2", accent: "#00CCFF", dark: "#0F243D" },
      defaultSeo: {
        title: "Beautifully designed. Seriously engineered.",
        description:
          "Inheritix builds software that makes complex businesses easier to run and digital products people enjoy using.",
      },
      footerHeading: "Have a project in mind?",
      footerInvitation: "Let’s make something worth using.",
      footerCtaLabel: "Tell us what you’re building",
      copyright: "INHERITIX Technologies",
      location: "Amman, Jordan",
    },
    () => ({
      defaultSeo: {
        title: "تصميم متقن. هندسة جادة.",
        description: "تبني INHERITIX برمجيات تسهّل إدارة الأعمال المعقدة ومنتجات رقمية يستمتع الناس باستخدامها.",
      },
      footerHeading: "لديك مشروع في ذهنك؟",
      footerInvitation: "لنصنع شيئًا يستحق الاستخدام.",
      footerCtaLabel: "حدثنا عما تريد بناءه",
      location: "عمّان، الأردن",
    }),
  )

  const nav = [
    { en: "Services", ar: "الخدمات", href: "/services" },
    { en: "Products", ar: "المنتجات", href: "/products" },
    { en: "Projects", ar: "المشاريع", href: "/projects" },
    { en: "About", ar: "عن الشركة", href: "/about" },
    { en: "Insights", ar: "الرؤى", href: "/insights" },
    { en: "Contact", ar: "تواصل معنا", href: "/contact" },
  ]
  await initGlobal(
    "navigation",
    {
      items: nav.map((n) => ({ label: n.en, href: n.href })),
      headerCta: { label: "Start a Project", href: "/contact" },
    },
    (saved) => ({
      items: localizeRows(saved.items, nav.map((n) => ({ label: n.ar }))),
      headerCta: { label: "ابدأ مشروعك", href: saved.headerCta?.href },
    }),
  )

  const logisttex = await findOneBy("products", "slug", "logisttex")
  const fen = await findOneBy("products", "slug", "fen-el-menu")
  const phases = [
    { number: "01", name: { en: "Discovery", ar: "الاستكشاف" }, description: { en: "Define the problem, users, constraints, and measure of success.", ar: "تحديد المشكلة والمستخدمين والقيود ومقاييس النجاح." } },
    { number: "02", name: { en: "Design", ar: "التصميم" }, description: { en: "Make workflows tangible, test the hard parts, and shape the system.", ar: "تجسيد سير العمل، اختبار الأجزاء الصعبة، وتشكيل النظام." } },
    { number: "03", name: { en: "Engineering", ar: "الهندسة" }, description: { en: "Build with resilient architecture and disciplined delivery.", ar: "البناء ببنية مرنة وتسليم منضبط وموثوق." } },
    { number: "04", name: { en: "Launch", ar: "الإطلاق" }, description: { en: "Release thoughtfully, learn from use, and improve what matters.", ar: "الإطلاق المدروس، والتعلم من الاستخدام، وتحسين ما يهم حقًا." } },
  ]
  await initGlobal(
    "page-home",
    {
      heroIndex: "INH—01 / DIGITAL PRODUCTS",
      heroTitleA: "Beautifully designed.",
      heroTitleB: "Seriously engineered.",
      heroCopy: "We build software that makes complex businesses easier to run—and digital products people enjoy using.",
      heroPrimaryCta: { label: "Explore Our Work", href: "/projects" },
      heroSecondaryCta: { label: "Start a Project", href: "/contact" },
      sectionOrder: ["showcase", "selectedWork", "capabilities", "products", "approach", "perspective", "insights"].map(
        (section) => ({ section }),
      ),
      showcaseSection: { visible: true, stageLabel: "LOGISTICS, IN MOTION", stageNote: "Two products. One standard: clarity." },
      selectedWorkSection: {
        visible: true,
        label: "Selected work",
        title: "Digital products with real work to do.",
        featuredProduct: logisttex?.id,
        featuredEyebrow: "INHERITIX PRODUCT · LOGISTICS",
        secondaryProduct: fen?.id,
        secondaryEyebrow: "INHERITIX PRODUCT · HOSPITALITY",
        productCtaLabel: "View product",
        storyCard: {
          visible: true,
          visualIndex: "01—06",
          visualText: "Systems that fit the business.",
          eyebrow: "CAPABILITY STORY · CUSTOM SOFTWARE",
          title: "Built around the work",
          description: "We turn complex workflows into clear tools that teams can rely on.",
          cta: { label: "See the service", href: "/services/custom-software" },
        },
      },
      capabilitiesSection: { visible: true, label: "Capabilities", title: "From first idea to working system." },
      productsDarkSection: { visible: true, label: "Our products", title: "Software we believe in—and build.", ctaPrefix: "Explore" },
      approachSection: {
        visible: true,
        label: "Our approach",
        title: "Four phases. One connected team.",
        phases: phases.map((p) => ({ number: p.number, name: p.name.en, description: p.description.en })),
      },
      perspectiveSection: {
        visible: true,
        eyebrow: "Our perspective",
        title: "Beauty isn’t the final layer. It’s a way of thinking.",
        description:
          "We are one design and engineering team. We believe the best software makes complexity understandable—and everyday work more human.",
        cta: { label: "About Inheritix", href: "/about" },
        imageAlt: "Geometric blue and white architectural facade",
      },
      insightsSection: { visible: true, label: "Our perspective", title: "Thinking for better digital work." },
      seo: {
        title: "Beautifully designed. Seriously engineered.",
        description: "We build software that makes complex businesses easier to run and digital products people enjoy using.",
      },
    },
    (saved) => ({
      heroTitleA: "مصمم بإتقان.",
      heroTitleB: "مُهندَس بجدية.",
      heroCopy: "نبني برمجيات تجعل الأعمال المعقدة أسهل في الإدارة، ومنتجات رقمية يستمتع الناس باستخدامها.",
      heroPrimaryCta: { ...saved.heroPrimaryCta, label: "استكشف أعمالنا" },
      heroSecondaryCta: { ...saved.heroSecondaryCta, label: "ابدأ مشروعك" },
      showcaseSection: { ...saved.showcaseSection, stageLabel: "الخدمات اللوجستية، في حركة", stageNote: "منتجان. معيار واحد: الوضوح." },
      selectedWorkSection: {
        ...saved.selectedWorkSection,
        featuredProduct: saved.selectedWorkSection?.featuredProduct?.id ?? saved.selectedWorkSection?.featuredProduct,
        secondaryProduct: saved.selectedWorkSection?.secondaryProduct?.id ?? saved.selectedWorkSection?.secondaryProduct,
        label: "أعمال مختارة",
        title: "منتجات رقمية لها عمل حقيقي لتنجزه.",
        featuredEyebrow: "منتج INHERITIX · الخدمات اللوجستية",
        secondaryEyebrow: "منتج INHERITIX · الضيافة",
        productCtaLabel: "اكتشف المنتج",
        storyCard: {
          ...saved.selectedWorkSection?.storyCard,
          visualText: "أنظمة تناسب طبيعة العمل.",
          eyebrow: "قصة قدرة · برمجيات مخصصة",
          title: "مصمم للعمل الفعلي",
          description: "نحوّل سير العمل المعقد إلى أدوات واضحة يمكن للفِرق الاعتماد عليها.",
          cta: { ...saved.selectedWorkSection?.storyCard?.cta, label: "تفاصيل الخدمة" },
        },
      },
      capabilitiesSection: { ...saved.capabilitiesSection, label: "قدراتنا", title: "من الفكرة إلى نظام يعمل." },
      productsDarkSection: { ...saved.productsDarkSection, label: "منتجاتنا", title: "برمجيات نؤمن بها ونبنيها.", ctaPrefix: "تفاصيل" },
      approachSection: {
        ...saved.approachSection,
        label: "منهجيتنا",
        title: "أربع مراحل. فريق واحد.",
        phases: localizeRows(saved.approachSection?.phases, phases.map((p) => ({ name: p.name.ar, description: p.description.ar }))),
      },
      perspectiveSection: {
        ...saved.perspectiveSection,
        eyebrow: "وجهة نظرنا",
        title: "الجمال ليس طبقة أخيرة. إنه طريقة تفكير.",
        description: "نحن فريق تصميم وهندسة واحد. نعتقد أن البرمجيات الأفضل تجعل التعقيد مفهومًا والعمل اليومي أكثر إنسانية.",
        cta: { ...saved.perspectiveSection?.cta, label: "تعرف علينا" },
        imageAlt: "واجهة معمارية هندسية باللونين الأزرق والأبيض",
      },
      insightsSection: { ...saved.insightsSection, label: "وجهة نظرنا", title: "أفكار للعمل الرقمي الأفضل." },
      seo: {
        title: "تصميم متقن. هندسة جادة.",
        description: "نبني برمجيات تجعل الأعمال المعقدة أسهل في الإدارة، ومنتجات رقمية يستمتع الناس باستخدامها.",
      },
    }),
  )

  const principles = [
    { number: "01", title: { en: "Clarity over theatre", ar: "الوضوح فوق الاستعراض" }, description: { en: "We make the work and the product understandable.", ar: "نجعل طبيعة العمل والمنتج مفهومة للجميع." } },
    { number: "02", title: { en: "Useful is beautiful", ar: "المفيد هو الجميل" }, description: { en: "Aesthetics and function should reinforce one another.", ar: "الجماليات والوظيفة يجب أن تعزز إحداهما الأخرى." } },
    { number: "03", title: { en: "Build for change", ar: "البناء من أجل التغيير" }, description: { en: "Good architecture leaves room for what comes next.", ar: "البنية البرمجية الجيدة تترك مساحة لما سيأتي مستقبلاً." } },
    { number: "04", title: { en: "Work in the open", ar: "العمل بشفافية ووضوح" }, description: { en: "Progress, risks, and decisions stay visible.", ar: "يبقى التقدم والمخاطر والقرارات واضحة أمام الجميع." } },
  ]
  await initGlobal(
    "page-about",
    {
      kicker: "ABOUT INHERITIX",
      title: "Product-studio confidence. Engineering-company discipline.",
      intro:
        "INHERITIX Technologies designs and builds digital products, operational systems, and platforms for businesses ready to work better.",
      imageAlt: "Blue geometric architecture against open sky",
      manifestoEyebrow: "WHAT WE BELIEVE",
      manifestoTitle: "Software should respect the people who depend on it.",
      manifestoParagraphOne:
        "That means understanding the work before proposing the interface. Making difficult decisions visible. Building systems that can change without becoming fragile.",
      manifestoParagraphTwo:
        "We bring design and engineering into the same conversation from day one. The result is not decoration around technology. It is a product that feels coherent all the way through.",
      principles: principles.map((p) => ({ number: p.number, title: p.title.en, description: p.description.en })),
      seo: {
        title: "About",
        description: "Product-studio confidence. Engineering-company discipline. Meet INHERITIX Technologies.",
      },
    },
    (saved) => ({
      title: "استوديو منتج. عقلية هندسية.",
      intro: "تصمم وتبني INHERITIX Technologies منتجات رقمية وأنظمة تشغيلية ومنصات للشركات المستعدة للعمل بشكل أفضل.",
      imageAlt: "عمارة هندسية زرقاء في أفق مفتوح",
      manifestoEyebrow: "ما نؤمن به",
      manifestoTitle: "البرمجيات يجب أن تحترم الأشخاص الذين يعتمدون عليها.",
      manifestoParagraphOne:
        "هذا يعني فهم طبيعة العمل قبل اقتراح الواجهة. جعل القرارات الصعبة مرئية. بناء أنظمة يمكن أن تتغير دون أن تصبح هشة.",
      manifestoParagraphTwo:
        "نجمع التصميم والهندسة في نفس الحوار منذ اليوم الأول. والنتيجة ليست زينة حول التكنولوجيا، بل منتج متماسك في كل تفاصيله.",
      principles: localizeRows(saved.principles, principles.map((p) => ({ title: p.title.ar, description: p.description.ar }))),
      seo: { title: "عن الشركة", description: "تعرّف على منظور التصميم والهندسة وراء INHERITIX." },
    }),
  )

  await initGlobal(
    "page-contact",
    {
      kicker: "START A CONVERSATION",
      title: "What can we build together?",
      intro: "Choose the conversation that fits. We’ll make sure it reaches the right people.",
      directEmail: "hello@inheritix.com",
      directNote: "For partnerships, careers, and everything else, use general inquiry.",
      boundaryNotice:
        "Online submission and email routing arrive in the next release. For active inquiries, please email hello@inheritix.com directly.",
      seo: { title: "Contact", description: "Tell Inheritix about your product, platform, or operational software challenge." },
      form: englishOf(CONTACT_FORM_COPY),
    },
    () => ({
      form: arabicOf(CONTACT_FORM_COPY),
      title: "ما الذي يمكننا بناؤه معًا؟",
      intro: "اختر نوع المحادثة المناسب. وسنتأكد من وصولها إلى الأشخاص المعنيين.",
      directNote: "للشراكات وفرص العمل والاستفسارات العامة، استخدم الاستفسار العام.",
      boundaryNotice: "الإرسال عبر الإنترنت وتوجيه البريد الإلكتروني متاحان في الإصدار القادم. للاستفسارات الحالية، راسلنا مباشرة على hello@inheritix.com.",
      seo: { title: "تواصل معنا", description: "حدّث INHERITIX عن منتجك أو منصتك أو تحدي البرمجيات لديك." },
    }),
  )

  await initGlobal(
    "listing-pages",
    {
      services: {
        kicker: "SERVICES / 01—06",
        title: "Software for the hard parts of work.",
        intro: "From a new digital product to a core business system, we bring product thinking, design, and engineering together.",
        cardNote: LISTING_COPY.servicesCardNote.en,
        seo: { title: "Services", description: "Custom software, SaaS, ERP, mobile applications, AI automation, and WordPress engineering." },
      },
      products: {
        kicker: "INHERITIX PRODUCTS",
        title: "Products shaped by real operations.",
        intro: "We build and own focused software products for industries where clarity, speed, and a dependable workflow matter.",
        seo: { title: "Products", description: "Explore digital products designed and engineered by Inheritix: LOGISTTEX and Fen El Menu." },
      },
      projects: {
        kicker: "PROJECTS",
        title: "Digital systems designed for real work.",
        intro: "Operational platforms and digital products designed and engineered with our clients.",
        seo: { title: "Projects", description: "Digital systems, operational platforms, and software engineered for clients by Inheritix." },
      },
      insights: {
        kicker: "INSIGHTS",
        title: "The thinking behind the work.",
        intro: "Practical perspectives on product design, software engineering, automation, and the operational systems between them.",
        sectionLabel: LISTING_COPY.insightsSectionLabel.en,
        sectionTitle: LISTING_COPY.insightsSectionTitle.en,
        seo: { title: "Insights", description: "Practical perspectives on product design, software engineering, automation, and operational systems." },
      },
    },
    (saved) => ({
      services: { ...saved.services, cardNote: LISTING_COPY.servicesCardNote.ar, title: "برمجيات تحل العمل الصعب.", intro: "من منتج جديد إلى نظام أعمال أساسي، نجمع بين التفكير بالمنتج والتصميم والهندسة.", seo: { title: "الخدمات", description: "برمجيات مخصصة ومنصات SaaS وأنظمة ERP وتطبيقات جوال وأتمتة بالذكاء الاصطناعي وتطوير WordPress." } },
      products: { ...saved.products, title: "منتجات صنعتها خبرة حقيقية.", intro: "نبني ونمتلك منتجات برمجية متخصصة للقطاعات التي تهتم بالوضوح والسرعة وسير العمل الموثوق.", seo: { title: "المنتجات", description: "استكشف المنتجات الرقمية التي تصممها وتهندسها INHERITIX." } },
      projects: { ...saved.projects, title: "أنظمة رقمية مصممة للعمل الحقيقي.", intro: "منصات تشغيلية ومنتجات رقمية صممناها وهندسناها مع عملائنا.", seo: { title: "المشاريع", description: "أنظمة رقمية ومنصات تشغيلية وبرمجيات هندستها INHERITIX لعملائها." } },
      insights: { ...saved.insights, sectionLabel: LISTING_COPY.insightsSectionLabel.ar, sectionTitle: LISTING_COPY.insightsSectionTitle.ar, title: "الملاحظات وراء العمل.", intro: "رؤى عملية حول تصميم المنتجات وهندسة البرمجيات والأتمتة والأنظمة التشغيلية بينهما.", seo: { title: "الرؤى", description: "ملاحظات حول تفكير المنتجات والتصميم والهندسة والعمليات الرقمية." } },
    }),
  )

  await initGlobal(
    "site-labels",
    {
      exploreWork: "Explore Our Work",
      startProject: "Start a Project",
      viewProduct: "View product",
      viewProject: "View project",
      explore: "Explore",
      readStory: "Read the story",
      seeService: "See service",
      requestDemo: "Request a demo",
      discussProject: "Discuss your project",
      allProjects: "All projects",
      previousPage: "Previous page",
      nextPage: "Next page",
      backToTop: "Back to top",
      skipToContent: "Skip to content",
      changeLanguage: "Switch to Arabic",
      ...englishOf(SITE_LABEL_COPY),
      articleCta: { visible: true, href: "/contact", ...englishOf(ARTICLE_CTA_COPY) },
    },
    () => ({
      ...arabicOf(SITE_LABEL_COPY),
      articleCta: { visible: true, href: "/contact", ...arabicOf(ARTICLE_CTA_COPY) },
      exploreWork: "استكشف أعمالنا",
      startProject: "ابدأ مشروعك",
      viewProduct: "اكتشف المنتج",
      viewProject: "عرض المشروع",
      explore: "استكشف",
      readStory: "اقرأ القصة",
      seeService: "تفاصيل الخدمة",
      requestDemo: "طلب عرض توضيحي",
      discussProject: "ناقش مشروعك",
      allProjects: "كل المشاريع",
      previousPage: "الصفحة السابقة",
      nextPage: "الصفحة التالية",
      backToTop: "العودة إلى الأعلى",
      skipToContent: "انتقل إلى المحتوى",
      changeLanguage: "التغيير إلى الإنجليزية",
    }),
  )

  // Private operational settings are created only when missing. Notifications
  // deliberately start disabled and no credentials or recipient are invented.
  await initGlobal("email-settings" as never, {
    notificationsEnabled: false,
    smtpPort: 587,
    encryptionMode: "starttls",
    passwordConfigured: false,
    submissionLimitPerHour: 10,
    adminTestLimitPerHour: 5,
    lastConnectionTestStatus: "never",
    lastTestEmailStatus: "never",
  })
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🌱 Seeding Inheritix content into ${describeDatabase()} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`)
  payload = await getPayload({ config })

  const steps: Array<[string, () => Promise<unknown>]> = [
    ["Checking administrators", checkAdministrators],
    ["Services", seedServices],
    ["Products", seedProducts],
  ]
  for (const [label, run] of steps) {
    console.log(`→ ${label}`)
    await run()
  }
  console.log("→ Categories & author")
  const categories = await seedCategories()
  const authorId = await seedAuthor()
  console.log("→ Articles")
  await seedArticles(categories, authorId)
  console.log("→ Sample projects (drafts)")
  await seedSampleProjects()
  console.log("→ Globals")
  await seedGlobals()

  console.log(`\nCreated (${summary.created.length}):`)
  for (const item of summary.created) console.log(`  + ${item}`)
  console.log(`Kept existing, untouched (${summary.kept.length}):`)
  for (const item of summary.kept) console.log(`  = ${item}`)
  console.log("\n✅ Seed finished without errors.")
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error("\n❌ Seed failed — no success reported. Fix the error below and re-run (the seed is idempotent).")
  console.error(error)
  process.exit(1)
}
