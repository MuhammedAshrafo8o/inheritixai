import type { Project } from "./types"

/**
 * DEVELOPMENT FIXTURES ONLY.
 * These records are not approved client work and must not be imported by the
 * future Payload public-data adapter. They exist only to exercise milestone-one
 * listing/detail layouts until approved published records are available.
 */
export const projectFixtures: Project[] = [
  {
    id: "fixture-operations-platform",
    slug: "operations-platform",
    previousSlugs: [],
    status: "development-fixture",
    featured: true,
    title: { en: "Operations platform", ar: "منصة العمليات" },
    summary: {
      en: "A configurable operations workspace that turns fragmented processes into one clear system.",
      ar: "مساحة عمل تشغيلية مرنة تجمع الإجراءات المتفرقة في نظام واحد واضح.",
    },
    sector: { en: "Enterprise operations", ar: "عمليات المؤسسات" },
    services: [
      { en: "Product strategy", ar: "استراتيجية المنتج" },
      { en: "Custom software", ar: "برمجيات مخصصة" },
    ],
    year: "2026",
    cardImage: {
      id: "fixture-operations-card",
      src: "/project-fixtures/operations-platform.svg",
      alt: {
        en: "Abstract operations dashboard with cards and a cyan status ring",
        ar: "لوحة عمليات تجريدية تحتوي على بطاقات وحلقة حالة سماوية",
      },
      description: {
        en: "A stylized, non-client dashboard used only to validate the project-card layout.",
        ar: "لوحة معلومات تجريبية وغير مرتبطة بعميل، تُستخدم فقط لاختبار تخطيط بطاقة المشروع.",
      },
      width: 1600,
      height: 1200,
    },
    heroImage: {
      id: "fixture-operations-hero",
      src: "/project-fixtures/operations-platform.svg",
      alt: {
        en: "Abstract operational system interface",
        ar: "واجهة تجريدية لنظام تشغيلي",
      },
      description: {
        en: "Illustrative development fixture representing an operational system.",
        ar: "نموذج تطوير توضيحي يمثل نظامًا تشغيليًا.",
      },
      width: 1600,
      height: 1200,
    },
    blocks: [
      {
        id: "operations-challenge",
        blockType: "intro",
        eyebrow: { en: "The challenge", ar: "التحدي" },
        heading: {
          en: "Make the system match the mental model.",
          ar: "اجعل النظام يطابق طريقة تفكير الفريق.",
        },
        body: {
          en: "The layout demonstrates how approved case studies can explain business context without exposing draft client claims.",
          ar: "يوضح هذا التخطيط كيف يمكن لدراسات الحالة المعتمدة شرح سياق العمل دون نشر ادعاءات عميل غير معتمدة.",
        },
      },
      {
        id: "operations-metrics",
        blockType: "metrics",
        items: [
          {
            id: "metric-one",
            value: { en: "01", ar: "٠١" },
            label: { en: "Connected workspace", ar: "مساحة عمل مترابطة" },
          },
          {
            id: "metric-two",
            value: { en: "06", ar: "٠٦" },
            label: { en: "Reorderable block types", ar: "أنواع محتوى قابلة لإعادة الترتيب" },
          },
          {
            id: "metric-three",
            value: { en: "2", ar: "٢" },
            label: { en: "Localized experiences", ar: "تجربتان محليتان" },
          },
        ],
      },
      {
        id: "operations-approach",
        blockType: "richText",
        heading: {
          en: "Prototype where uncertainty is highest.",
          ar: "اختبر النموذج حيث تكون درجة عدم اليقين أعلى.",
        },
        body: {
          en: "This section is intentionally illustrative. A real record will remain a Payload draft until an authorized editor publishes it.",
          ar: "هذا القسم توضيحي عمدًا. سيبقى السجل الحقيقي مسودة في Payload حتى ينشره محرر مخوّل.",
        },
      },
      {
        id: "operations-cta",
        blockType: "cta",
        heading: {
          en: "Have a complex workflow to simplify?",
          ar: "هل لديك سير عمل معقد تريد تبسيطه؟",
        },
        action: {
          label: { en: "Discuss your project", ar: "ناقش مشروعك" },
          href: { en: "/contact", ar: "/ar/contact" },
        },
      },
    ],
    relatedProjectIds: ["fixture-service-platform"],
    seo: {
      title: {
        en: "Operations platform — development fixture",
        ar: "منصة العمليات — نموذج تطوير",
      },
      description: {
        en: "Illustrative project layout fixture. Not published client work.",
        ar: "نموذج توضيحي لتخطيط المشروع، وليس عملاً منشورًا لعميل.",
      },
      noIndex: true,
    },
  },
  {
    id: "fixture-service-platform",
    slug: "service-platform",
    previousSlugs: [],
    status: "development-fixture",
    featured: false,
    title: { en: "Service platform", ar: "منصة الخدمات" },
    summary: {
      en: "A bilingual service journey designed to keep complex choices understandable.",
      ar: "رحلة خدمات ثنائية اللغة تجعل الخيارات المعقدة سهلة الفهم.",
    },
    sector: { en: "Digital services", ar: "الخدمات الرقمية" },
    services: [
      { en: "UX design", ar: "تصميم تجربة المستخدم" },
      { en: "Web application", ar: "تطبيق ويب" },
    ],
    year: "2026",
    cardImage: {
      id: "fixture-service-card",
      src: "/project-fixtures/service-platform.svg",
      alt: {
        en: "Abstract cobalt and white bilingual service interface",
        ar: "واجهة خدمات تجريدية ثنائية اللغة بالأزرق والأبيض",
      },
      description: {
        en: "A stylized development fixture for responsive project layouts.",
        ar: "نموذج تطوير تجريبي لتخطيطات المشاريع المتجاوبة.",
      },
      width: 1600,
      height: 1200,
    },
    heroImage: {
      id: "fixture-service-hero",
      src: "/project-fixtures/service-platform.svg",
      alt: {
        en: "Abstract service platform interface",
        ar: "واجهة تجريدية لمنصة خدمات",
      },
      description: {
        en: "Illustrative interface used only during frontend development.",
        ar: "واجهة توضيحية تُستخدم فقط أثناء تطوير الواجهة الأمامية.",
      },
      width: 1600,
      height: 1200,
    },
    blocks: [
      {
        id: "service-intro",
        blockType: "intro",
        eyebrow: { en: "The idea", ar: "الفكرة" },
        heading: {
          en: "Clarity in every direction.",
          ar: "وضوح في كل اتجاه.",
        },
        body: {
          en: "A placeholder narrative for validating English and Arabic editorial rhythm before CMS integration.",
          ar: "سرد مؤقت لاختبار الإيقاع التحريري باللغتين العربية والإنجليزية قبل ربط نظام إدارة المحتوى.",
        },
      },
      {
        id: "service-cta",
        blockType: "cta",
        heading: {
          en: "Design a service people can understand.",
          ar: "صمّم خدمة يفهمها الناس.",
        },
        action: {
          label: { en: "Start a project", ar: "ابدأ مشروعًا" },
          href: { en: "/contact", ar: "/ar/contact" },
        },
      },
    ],
    relatedProjectIds: ["fixture-operations-platform"],
    seo: {
      title: {
        en: "Service platform — development fixture",
        ar: "منصة الخدمات — نموذج تطوير",
      },
      description: {
        en: "Illustrative project layout fixture. Not published client work.",
        ar: "نموذج توضيحي لتخطيط المشروع، وليس عملاً منشورًا لعميل.",
      },
      noIndex: true,
    },
  },
]
