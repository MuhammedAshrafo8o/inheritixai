import React from "react"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"

interface ServiceDetailPageViewProps {
  lang: Locale
  service: Record<string, unknown>
}

export function ServiceDetailPageView({
  lang,
  service,
}: ServiceDetailPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const number = (service.number as string) || "01"
  const title = (service.title as string) || ""
  const intro =
    (service.heroIntro as string) ||
    (isAr
      ? `نصمم ونهندس ${title} التي تقلل الاحتكاك وتخلق وضوحًا تشغيليًا وتُبنى لتتطور مع نمو أعمالك.`
      : `We design and engineer ${title.toLowerCase()} that reduce friction, create visibility, and are built to evolve with your business.`)

  const problemEyebrow = (service.problemEyebrow as string) || (isAr ? "المشكلة" : "THE PROBLEM")
  const problemHeading =
    (service.problemHeading as string) ||
    (isAr ? "التعقيد يجب أن يخدم العمل — لا أن يبطئه." : "Complexity should serve the business—not slow it down.")
  const problemDesc =
    (service.problemDescription as string) ||
    (isAr
      ? "الأدوات المنفصلة والإجراءات الموروثة تخلق عملاً مكررًا وقرارات غير موثوقة. نبدأ بفهم أين يكمن الاحتكاك الحقيقي: في سير العمل، أو البيانات، أو الواجهة بينهما."
      : "Disconnected tools and inherited processes create duplicate work and unreliable decisions. We begin by understanding where the friction really lives: in the workflow, the data, or the interface between both.")

  const deliverablesEyebrow = (service.deliverablesEyebrow as string) || (isAr ? "ما نقدمه" : "WHAT WE DELIVER")
  const deliverablesHeading =
    (service.deliverablesHeading as string) ||
    (isAr ? "مسار متكامل من القرار إلى برمجيات تعمل بكفاءة." : "A complete path from decision to working software.")
  const deliverables = (service.deliverables as Array<{ item: string }>) || [
    { item: isAr ? "استراتيجية المنتج والتقنية" : "Product and technical strategy" },
    { item: isAr ? "رحلات المستخدم ومخططات الخدمة" : "User journeys and service blueprints" },
    { item: isAr ? "تصميم الواجهات والنماذج التفاعلية" : "Interface design and interactive prototypes" },
    { item: isAr ? "الهندسة الإنتاجية والتكاملات" : "Production engineering and integrations" },
    { item: isAr ? "ضمان الجودة ودعم الإطلاق" : "Quality assurance and launch support" },
  ]

  const processEyebrow = (service.processEyebrow as string) || (isAr ? "طريقة عملنا" : "HOW WE WORK")
  const processHeading =
    (service.processHeading as string) ||
    (isAr ? "اهتمام فائق، وتقدم مرئي مستمر." : "Senior attention, visible progress.")
  const processDesc =
    (service.processDescription as string) ||
    (isAr
      ? "يعمل فريق متعدد الوظائف في دورات عمل قصيرة وشفافة. كل دورة تنتج شيئًا ملموسًا للمراجعة والاختبار والتحسين—لتُتخذ القرارات المهمة بناءً على أدلة واقعية."
      : "A focused cross-functional team works in short, transparent cycles. Every cycle produces something tangible to review, test, and improve—so important decisions happen with evidence.")

  const nextEyebrow = (service.nextEyebrow as string) || (isAr ? "الخطوة التالية" : "NEXT STEP")
  const nextHeading =
    (service.nextHeading as string) ||
    (isAr ? "ابدأ بالمشكلة، وليس بقائمة ميزات." : "Start with the problem, not a feature list.")

  return (
    <main>
      <PageHero
        kicker={isAr ? `خدمة ${number}` : `SERVICE ${number}`}
        title={title}
        intro={intro}
      />

      <div className="detail-stage">
        <div className="detail-orbit">
          <span>{number}</span>
          <i />
          <i />
          <i />
        </div>
      </div>

      <section className="detail-body page-pad">
        <aside>
          <span>{isAr ? "في هذه الصفحة" : "ON THIS PAGE"}</span>
          <a href="#problem">{isAr ? "المشكلة" : "The problem"}</a>
          <a href="#deliverables">{isAr ? "المخرجات" : "Deliverables"}</a>
          <a href="#process">{isAr ? "العملية" : "Process"}</a>
          <a href="#next">{isAr ? "الخطوة التالية" : "Next step"}</a>
        </aside>

        <div>
          <article id="problem">
            <span className="eyebrow">{problemEyebrow}</span>
            <h2>{problemHeading}</h2>
            <p>{problemDesc}</p>
          </article>

          <article id="deliverables">
            <span className="eyebrow">{deliverablesEyebrow}</span>
            <h2>{deliverablesHeading}</h2>
            <ul>
              {deliverables.map((d, i) => (
                <li key={i}>{typeof d === "string" ? d : d.item}</li>
              ))}
            </ul>
          </article>

          <article id="process">
            <span className="eyebrow">{processEyebrow}</span>
            <h2>{processHeading}</h2>
            <p>{processDesc}</p>
          </article>

          <article id="next">
            <span className="eyebrow">{nextEyebrow}</span>
            <h2>{nextHeading}</h2>
            <Action to={`${prefix}/contact`}>
              {isAr ? "ناقش مشروعك" : "Discuss your project"}
            </Action>
          </article>
        </div>
      </section>
    </main>
  )
}
