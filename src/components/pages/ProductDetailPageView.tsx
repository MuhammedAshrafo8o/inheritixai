import React from "react"
import { Action } from "../ui/Action"
import { SectionHead } from "../ui/SectionHead"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"

interface ProductDetailPageViewProps {
  lang: Locale
  product: Record<string, unknown>
}

export function ProductDetailPageView({
  lang,
  product,
}: ProductDetailPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const slug = (product.slug as string) || "logisttex"
  const isLogistics = slug === "logisttex"
  const name = (product.name as string) || (isLogistics ? "LOGISTTEX" : "Fen El Menu")
  const badge =
    (product.badge as string) ||
    (isLogistics ? "INHERITIX PRODUCT / LOGISTICS" : "INHERITIX PRODUCT / HOSPITALITY")
  const headline =
    (product.heroHeadline as string) ||
    (isLogistics
      ? isAr
        ? "العمليات اللوجستية تحت السيطرة."
        : "Logistics, under control."
      : isAr
        ? "طريقة أفضل للتصفح والاختيار والطلب."
        : "A better way to browse, choose, and order.")
  const description =
    (product.heroDescription as string) ||
    (isLogistics
      ? isAr
        ? "نظام تشغيلي واحد للطلبات والأسطول والسائقين والتكاليف والقرارات اليومية."
        : "One operational system for orders, fleets, drivers, costs, and the decisions between them."
      : isAr
        ? "تجربة قائمة وطلب مرنة للمطاعم التي تهتم بكل تفصيل."
        : "A flexible digital menu designed to make ordering feel natural—and menu operations feel manageable.")

  const valuePoints = (product.valuePoints as Array<{ label: string; description: string }>) || [
    {
      label: isLogistics ? "ONE VIEW" : "EASY CHOICE",
      description: isLogistics
        ? isAr ? "شاهد العملية فور حدوثها." : "See the operation as it happens."
        : isAr ? "قوائم واضحة وتفاصيل سهلة القراءة." : "Readable menus, modifiers, and details.",
    },
    {
      label: isLogistics ? "LESS CHASING" : "FASTER UPDATES",
      description: isLogistics
        ? isAr ? "حافظ على تناغم الفِرق والسائقين." : "Keep teams and drivers coordinated."
        : isAr ? "تعديل العناصر والتوافر مركزيًا بسرعة." : "Change items and availability centrally.",
    },
    {
      label: isLogistics ? "BETTER SIGNAL" : "BRAND-READY",
      description: isLogistics
        ? isAr ? "حوّل النشاط اليومي إلى قرارات مفيدة." : "Turn activity into useful decisions."
        : isAr ? "تجربة تعكس روح مطعمك وهويته." : "An experience that feels like your restaurant.",
    },
  ]

  const workflowSteps = (product.workflowSteps as Array<{ stepNumber: string; name: string }>) || (
    isLogistics
      ? [
          { stepNumber: "01", name: isAr ? "استلام" : "Capture" },
          { stepNumber: "02", name: isAr ? "تخطيط" : "Plan" },
          { stepNumber: "03", name: isAr ? "توجيه" : "Dispatch" },
          { stepNumber: "04", name: isAr ? "تتبع" : "Track" },
          { stepNumber: "05", name: isAr ? "تسوية" : "Settle" },
        ]
      : [
          { stepNumber: "01", name: isAr ? "تصفح" : "Browse" },
          { stepNumber: "02", name: isAr ? "تخصيص" : "Customize" },
          { stepNumber: "03", name: isAr ? "مراجعة" : "Review" },
          { stepNumber: "04", name: isAr ? "طلب" : "Order" },
          { stepNumber: "05", name: isAr ? "استمتاع" : "Enjoy" },
        ]
  )

  const faqs = (product.faqs as Array<{ question: string; answer: string }>) || (
    isLogistics
      ? [
          {
            question: isAr ? "لمن صُممت منصة LOGISTTEX؟" : "Who is LOGISTTEX for?",
            answer: isAr
              ? "صُممت للفِرق النامية التي تحتاج إلى سير عمل رقمي أكثر وضوحًا وموثوقية."
              : "It is designed for growing teams that need a clearer, more dependable digital workflow.",
          },
          {
            question: isAr ? "هل يمكن للمنصة التوافق مع سير عملنا الحالي؟" : "Can it fit our current workflow?",
            answer: isAr
              ? "المنتج مرن وقابل للتخصيص. نبدأ بجلسة استكشافية، ثم نوضح كيف يدعم أولوياتك الحالية."
              : "The product is configurable. We begin with a short discovery session, then show how it can support your current operation and priorities.",
          },
        ]
      : [
          {
            question: isAr ? "ما نوع المطاعم التي يناسبها Fen El Menu؟" : "What kind of restaurants is it for?",
            answer: isAr
              ? "يناسب المطاعم ومجموعات الضيافة التي تسعى لتجربة طلب راقية وسريعة لضيوفها."
              : "It is designed for quality-focused restaurants looking to provide guests with an effortless, modern dining journey.",
          },
        ]
  )

  return (
    <main className={isLogistics ? "product-page logistics" : "product-page fen"}>
      {/* 1. HERO */}
      <section className="product-hero page-pad">
        <span className="eyebrow">{badge}</span>
        <h1>{headline}</h1>
        <p>{description}</p>
        <Action to={`${prefix}/contact?type=demo`}>
          {isAr ? "طلب عرض توضيحي" : "Request a demo"}
        </Action>
      </section>

      {/* 2. VISUAL */}
      <div className="product-hero-visual">
        {isLogistics ? (
          <Dashboard />
        ) : (
          <div className="phones">
            <MenuPhone />
            <MenuPhone />
            <MenuPhone />
          </div>
        )}
      </div>

      {/* 3. VALUE STRIP */}
      <section className="value-strip page-pad">
        {valuePoints.map((v, i) => (
          <div key={i}>
            <span>{v.label}</span>
            <p>{v.description}</p>
          </div>
        ))}
      </section>

      {/* 4. WORKFLOW LINE */}
      <section className="workflow page-pad">
        <SectionHead
          label={isAr ? "سير العمل الأساسي" : "CORE WORKFLOW"}
          title={
            isLogistics
              ? isAr ? "من الطلب إلى إثبات التسليم." : "From order to proof of delivery."
              : isAr ? "من الاستكشاف إلى تأكيد الطلب." : "From discovery to a confirmed order."
          }
        />
        <div className="workflow-line">
          {workflowSteps.map((step) => (
            <div key={step.stepNumber}>
              <span>{step.stepNumber}</span>
              <b>{step.name}</b>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INTERFACE TOUR */}
      <section className="interface-tour page-pad">
        <SectionHead
          label={isAr ? "جولة في الواجهة" : "INTERFACE TOUR"}
          title={
            isAr
              ? "المعلومات التي تحتاجها فقط، دون أي تشويش."
              : "The information you need. Nothing you don’t."
          }
        />
        <div className="tour-large">
          {isLogistics ? <Dashboard /> : <MenuPhone />}
        </div>
        <div className="tour-copy">
          <h3>
            {isLogistics
              ? isAr ? "رؤية تشغيلية واضحة بدون ضجيج." : "Operational visibility without the noise."
              : isAr ? "قائمة طعام تبرز روعة الأطباق." : "A menu that helps the food speak."}
          </h3>
          <p>
            {isAr
              ? "كل شاشة منظمة حول القرار التالي الأكثر فائدة. التسلسل الهرمي الواضح والسياق المناسب والتفاعل السريع يجعل التجربة مركزة وفعالة."
              : "Every screen is organized around the next useful decision. Clear hierarchy, relevant context, and responsive interaction keep the experience focused."}
          </p>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="faq page-pad">
        <SectionHead
          label={isAr ? "الأسئلة الشائعة" : "FAQ"}
          title={isAr ? "إجابات على استفساراتك." : "Questions, answered."}
        />
        {faqs.map((q, i) => (
          <details key={i}>
            <summary>
              {q.question}
              <span>＋</span>
            </summary>
            <p>{q.answer}</p>
          </details>
        ))}
      </section>
    </main>
  )
}
