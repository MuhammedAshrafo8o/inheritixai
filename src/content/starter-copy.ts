/**
 * Approved starter copy (English + Arabic) for CMS fields.
 *
 * Used in three places so the website never needs hardcoded text:
 * - field `defaultValue`s (English) for new documents / never-saved globals,
 * - `scripts/seed.ts` for fresh databases (both locales),
 * - the `content_controls` migration, which stores this copy for existing
 *   records that previously relied on code fallbacks.
 * After that, an empty field always means "intentionally empty" and the
 * corresponding element is hidden on the website.
 */
export type Bilingual = { en: string; ar: string }

export const SITE_LABEL_COPY = {
  // header / accessibility
  mainNavigation: { en: "Main navigation", ar: "التنقل الرئيسي" },
  openMenu: { en: "Open navigation", ar: "فتح القائمة" },
  closeMenu: { en: "Close navigation", ar: "إغلاق القائمة" },
  languageToggle: { en: "العربية", ar: "EN" },
  // projects
  sector: { en: "Sector", ar: "القطاع" },
  services: { en: "Services", ar: "الخدمات" },
  year: { en: "Year", ar: "السنة" },
  technology: { en: "Technology", ar: "التقنيات" },
  visitClientSite: { en: "Visit client site", ar: "الموقع الإلكتروني للعميل" },
  relatedProjectsLabel: { en: "Related projects", ar: "مشاريع مرتبطة" },
  relatedProjectsTitle: { en: "Continue exploring", ar: "استكشف المزيد" },
  projectList: { en: "Project list", ar: "قائمة المشاريع" },
  filterProjects: { en: "Filter projects", ar: "تصفية المشاريع" },
  projectPages: { en: "Project pages", ar: "صفحات المشاريع" },
  draftPreview: { en: "Draft preview", ar: "معاينة مسودة" },
  draftPreviewNote: {
    en: "Unpublished — visible to signed-in editors only.",
    ar: "هذه الصفحة غير منشورة ومرئية للمحررين فقط.",
  },
  // articles
  contents: { en: "CONTENTS", ar: "المحتويات" },
  moreInsightsLabel: { en: "MORE INSIGHTS", ar: "مقالات أخرى" },
  moreInsightsTitle: { en: "Thinking for better digital work.", ar: "أفكار للعمل الرقمي الأفضل." },
  // services
  serviceKicker: { en: "SERVICE", ar: "خدمة" },
  onThisPage: { en: "ON THIS PAGE", ar: "في هذه الصفحة" },
  problemNav: { en: "The problem", ar: "المشكلة" },
  deliverablesNav: { en: "Deliverables", ar: "المخرجات" },
  processNav: { en: "Process", ar: "العملية" },
  nextStepNav: { en: "Next step", ar: "الخطوة التالية" },
  // products
  coreWorkflow: { en: "CORE WORKFLOW", ar: "سير العمل الأساسي" },
  interfaceTour: { en: "INTERFACE TOUR", ar: "جولة في الواجهة" },
  interfaceTourTitle: {
    en: "The information you need. Nothing you don’t.",
    ar: "المعلومات التي تحتاجها فقط، دون أي تشويش.",
  },
  faq: { en: "FAQ", ar: "الأسئلة الشائعة" },
  faqTitle: { en: "Questions, answered.", ar: "إجابات على استفساراتك." },
  // error pages
  notFoundEyebrow: { en: "404 / NOT FOUND", ar: "404 / الصفحة غير موجودة" },
  notFoundTitle: { en: "This page isn’t here.", ar: "هذه الصفحة غير موجودة." },
  notFoundBody: { en: "The address may have changed.", ar: "ربما تغير العنوان." },
  notFoundLink: { en: "Return to Inheritix", ar: "العودة إلى Inheritix" },
  errorEyebrow: { en: "500 / SERVICE ERROR", ar: "500 / خطأ في الخدمة" },
  errorTitle: { en: "This page couldn’t be loaded.", ar: "تعذر تحميل هذه الصفحة." },
  errorBody: {
    en: "Something went wrong while fetching content. Please try again shortly.",
    ar: "حدث خطأ أثناء جلب المحتوى. حاول مرة أخرى بعد قليل.",
  },
  errorRetry: { en: "Try again", ar: "إعادة المحاولة" },
} satisfies Record<string, Bilingual>

export const ARTICLE_CTA_COPY = {
  eyebrow: { en: "BUILDING AN OPERATIONAL PRODUCT?", ar: "هل تبني منتجًا تشغيليًا؟" },
  title: { en: "We can help make the workflow clear.", ar: "يمكننا مساعدتك في جعل سير العمل واضحًا وفعالاً." },
  label: { en: "Talk to our team", ar: "تحدث مع فريقنا" },
} satisfies Record<string, Bilingual>

export const LISTING_COPY = {
  servicesCardNote: {
    en: "We map the real constraints, design for the people doing the work, and engineer for change.",
    ar: "نحدد القيود الواقعية، ونصمم للأشخاص الذين يؤدون العمل، ونهندس للتكيف والتطور المستمر.",
  },
  insightsSectionLabel: { en: "Our perspective", ar: "وجهة نظرنا" },
  insightsSectionTitle: { en: "Thinking for better digital work.", ar: "أفكار للعمل الرقمي الأفضل." },
} satisfies Record<string, Bilingual>

export const CONTACT_FORM_COPY = {
  directContactLabel: { en: "DIRECT CONTACT", ar: "التواصل المباشر" },
  projectTab: { en: "Project inquiry", ar: "استفسار مشروع" },
  demoTab: { en: "Product demo", ar: "طلب عرض للمنتج" },
  generalTab: { en: "General inquiry", ar: "استفسار عام" },
  projectHeading: { en: "Tell us about the challenge.", ar: "أخبرنا عن التحدي الخاص بك." },
  demoHeading: { en: "See the product in your workflow.", ar: "شاهد المنتج في سير عملك." },
  generalHeading: { en: "How can we help?", ar: "كيف يمكننا مساعدتك؟" },
  nameLabel: { en: "Full name", ar: "الاسم الكامل" },
  namePlaceholder: { en: "Your name", ar: "اسمك الكامل" },
  emailLabel: { en: "Work email", ar: "بريد العمل الإلكتروني" },
  emailPlaceholder: { en: "you@company.com", ar: "you@company.com" },
  productLabel: { en: "Product", ar: "المنتج" },
  serviceLabel: { en: "What are you considering?", ar: "ما نوع المشروع الذي تفكر به؟" },
  messageLabel: { en: "Your message", ar: "رسالتك" },
  messagePlaceholder: { en: "A little context helps us prepare...", ar: "نبذة موجزة تساعدنا على الاستعداد..." },
  submitLabel: { en: "Send inquiry", ar: "إرسال الاستفسار" },
  statusLabel: { en: "Submission status:", ar: "حالة الخدمة:" },
  nameError: { en: "Please add your name.", ar: "يرجى كتابة الاسم." },
  emailError: { en: "Enter a valid work email.", ar: "أدخل بريد عمل صحيح." },
  messageError: { en: "Tell us a little about what you need.", ar: "أخبرنا قليلاً عن احتياجاتك." },
} satisfies Record<string, Bilingual>

/** Section copy every service previously inherited from code. */
export const SERVICE_SECTION_COPY = {
  problemHeading: {
    en: "Complexity should serve the business—not slow it down.",
    ar: "التعقيد يجب أن يخدم العمل — لا أن يبطئه.",
  },
  problemDescription: {
    en: "Disconnected tools and inherited processes create duplicate work and unreliable decisions. We begin by understanding where the friction really lives: in the workflow, the data, or the interface between both.",
    ar: "الأدوات المنفصلة والإجراءات الموروثة تخلق عملاً مكررًا وقرارات غير موثوقة. نبدأ بفهم أين يكمن الاحتكاك الحقيقي: في سير العمل، أو البيانات، أو الواجهة بينهما.",
  },
  deliverablesHeading: {
    en: "A complete path from decision to working software.",
    ar: "مسار متكامل من القرار إلى برمجيات تعمل بكفاءة.",
  },
  processHeading: { en: "Senior attention, visible progress.", ar: "اهتمام فائق، وتقدم مرئي مستمر." },
  processDescription: {
    en: "A focused cross-functional team works in short, transparent cycles. Every cycle produces something tangible to review, test, and improve—so important decisions happen with evidence.",
    ar: "يعمل فريق متعدد الوظائف في دورات عمل قصيرة وشفافة. كل دورة تنتج شيئًا ملموسًا للمراجعة والاختبار والتحسين—لتُتخذ القرارات المهمة بناءً على أدلة واقعية.",
  },
  nextHeading: { en: "Start with the problem, not a feature list.", ar: "ابدأ بالمشكلة، وليس بقائمة ميزات." },
} satisfies Record<string, Bilingual>

/** Product-specific section copy previously chosen in code by product type. */
export const PRODUCT_SECTION_COPY: Record<
  "dashboard" | "phone",
  { workflowTitle: Bilingual; tourTitle: Bilingual; tourDescription: Bilingual }
> = {
  dashboard: {
    workflowTitle: { en: "From order to proof of delivery.", ar: "من الطلب إلى إثبات التسليم." },
    tourTitle: { en: "Operational visibility without the noise.", ar: "رؤية تشغيلية واضحة بدون ضجيج." },
    tourDescription: {
      en: "Every screen is organized around the next useful decision. Clear hierarchy, relevant context, and responsive interaction keep the experience focused.",
      ar: "كل شاشة منظمة حول القرار التالي الأكثر فائدة. التسلسل الهرمي الواضح والسياق المناسب والتفاعل السريع يجعل التجربة مركزة وفعالة.",
    },
  },
  phone: {
    workflowTitle: { en: "From discovery to a confirmed order.", ar: "من الاستكشاف إلى تأكيد الطلب." },
    tourTitle: { en: "A menu that helps the food speak.", ar: "قائمة طعام تبرز روعة الأطباق." },
    tourDescription: {
      en: "Every screen is organized around the next useful decision. Clear hierarchy, relevant context, and responsive interaction keep the experience focused.",
      ar: "كل شاشة منظمة حول القرار التالي الأكثر فائدة. التسلسل الهرمي الواضح والسياق المناسب والتفاعل السريع يجعل التجربة مركزة وفعالة.",
    },
  },
}

export function englishOf<T extends Record<string, Bilingual>>(copy: T) {
  return Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.en])) as Record<keyof T, string>
}
export function arabicOf<T extends Record<string, Bilingual>>(copy: T) {
  return Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.ar])) as Record<keyof T, string>
}
