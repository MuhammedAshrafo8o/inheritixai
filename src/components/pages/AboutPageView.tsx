import React from "react"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"

interface AboutPageViewProps {
  lang: Locale
  aboutDoc?: any
}

export function AboutPageView({ lang, aboutDoc }: AboutPageViewProps) {
  const isAr = lang === "ar"

  const kicker = (aboutDoc?.kicker as string) || "ABOUT INHERITIX"
  const title =
    (aboutDoc?.title as string) ||
    (isAr
      ? "استوديو منتج. عقلية هندسية."
      : "Product-studio confidence. Engineering-company discipline.")
  const intro =
    (aboutDoc?.intro as string) ||
    (isAr
      ? "تصمم وتبني INHERITIX Technologies منتجات رقمية وأنظمة تشغيلية ومنصات للشركات المستعدة للعمل بشكل أفضل."
      : "INHERITIX Technologies designs and builds digital products, operational systems, and platforms for businesses ready to work better.")
  const imageUrl =
    (aboutDoc?.imageUrl as string) ||
    "https://images.unsplash.com/photo-1624012040629-a408026c0d3b?auto=format&fit=crop&w=1800&q=85"

  const manifestoEyebrow = (aboutDoc?.manifestoEyebrow as string) || (isAr ? "ما نؤمن به" : "WHAT WE BELIEVE")
  const manifestoTitle =
    (aboutDoc?.manifestoTitle as string) ||
    (isAr
      ? "البرمجيات يجب أن تحترم الأشخاص الذين يعتمدون عليها."
      : "Software should respect the people who depend on it.")
  const pOne =
    (aboutDoc?.manifestoParagraphOne as string) ||
    (isAr
      ? "هذا يعني فهم طبيعة العمل قبل اقتراح الواجهة. جعل القرارات الصعبة مرئية. بناء أنظمة يمكن أن تتغير دون أن تصبح هشة."
      : "That means understanding the work before proposing the interface. Making difficult decisions visible. Building systems that can change without becoming fragile.")
  const pTwo =
    (aboutDoc?.manifestoParagraphTwo as string) ||
    (isAr
      ? "نجمع التصميم والهندسة في نفس الحوار منذ اليوم الأول. والنتيجة ليست زينة حول التكنولوجيا، بل منتج متماسك في كل تفاصيله."
      : "We bring design and engineering into the same conversation from day one. The result is not decoration around technology. It is a product that feels coherent all the way through.")

  const principles = (aboutDoc?.principles as Array<{ number: string; title: string; description: string }>) || [
    {
      number: "01",
      title: isAr ? "الوضوح فوق الاستعراض" : "Clarity over theatre",
      description: isAr
        ? "نجعل طبيعة العمل والمنتج مفهومة للجميع."
        : "We make the work and the product understandable.",
    },
    {
      number: "02",
      title: isAr ? "المفيد هو الجميل" : "Useful is beautiful",
      description: isAr
        ? "الجماليات والوظيفة يجب أن تعزز إحداهما الأخرى."
        : "Aesthetics and function should reinforce one another.",
    },
    {
      number: "03",
      title: isAr ? "البناء من أجل التغيير" : "Build for change",
      description: isAr
        ? "البنية البرمجية الجيدة تترك مساحة لما سيأتي مستقبلاً."
        : "Good architecture leaves room for what comes next.",
    },
    {
      number: "04",
      title: isAr ? "العمل بشفافية ووضوح" : "Work in the open",
      description: isAr
        ? "يبقى التقدم والمخاطر والقرارات واضحة أمام الجميع."
        : "Progress, risks, and decisions stay visible.",
    },
  ]

  return (
    <main>
      <PageHero kicker={kicker} title={title} intro={intro} />

      <section className="about-image">
        <img
          src={imageUrl}
          alt={isAr ? "عمارة هندسية زرقاء في أفق مفتوح" : "Blue geometric architecture against open sky"}
        />
      </section>

      <section className="manifesto page-pad">
        <span className="eyebrow">{manifestoEyebrow}</span>
        <h2>{manifestoTitle}</h2>
        <div>
          <p>{pOne}</p>
          <p>{pTwo}</p>
        </div>
      </section>

      <section className="principles page-pad">
        {principles.map((pr) => (
          <div className="reveal" key={pr.number}>
            <span>{pr.number}</span>
            <h3>{pr.title}</h3>
            <p>{pr.description}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
