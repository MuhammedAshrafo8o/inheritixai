import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { Arrow } from "../ui/Icons"
import { SectionHead } from "../ui/SectionHead"
import { ProductStage } from "../mockups/ProductStage"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"

interface HomePageViewProps {
  lang: Locale
  homeDoc?: any
  services: Array<any>
  posts: Array<any>
}

export function HomePageView({
  lang,
  homeDoc,
  services,
  posts,
}: HomePageViewProps) {
  const isAr = lang === "ar"

  const heroIndex = (homeDoc?.heroIndex as string) || "INH—01 / DIGITAL PRODUCTS"
  const heroTitleA = (homeDoc?.heroTitleA as string) || (isAr ? "مصمم بإتقان." : "Beautifully designed.")
  const heroTitleB = (homeDoc?.heroTitleB as string) || (isAr ? "مُهندَس بجدية." : "Seriously engineered.")
  const heroCopy =
    (homeDoc?.heroCopy as string) ||
    (isAr
      ? "نبني برمجيات تجعل الأعمال المعقدة أسهل في الإدارة، ومنتجات رقمية يستمتع الناس باستخدامها."
      : "We build software that makes complex businesses easier to run—and digital products people enjoy using.")

  const workCtaText = isAr ? "استكشف أعمالنا" : "Explore Our Work"
  const startCtaText = isAr ? "ابدأ مشروعك" : "Start a Project"
  const prefix = isAr ? "/ar" : ""

  const approachPhases = [
    {
      number: "01",
      name: isAr ? "الاستكشاف" : "Discovery",
      desc: isAr
        ? "تحديد المشكلة والمستخدمين والقيود ومقاييس النجاح."
        : "Define the problem, users, constraints, and measure of success.",
    },
    {
      number: "02",
      name: isAr ? "التصميم" : "Design",
      desc: isAr
        ? "تجسيد سير العمل، اختبار الأجزاء الصعبة، وتشكيل النظام."
        : "Make workflows tangible, test the hard parts, and shape the system.",
    },
    {
      number: "03",
      name: isAr ? "الهندسة" : "Engineering",
      desc: isAr
        ? "البناء ببنية مرنة وتسليم منضبط وموثوق."
        : "Build with resilient architecture and disciplined delivery.",
    },
    {
      number: "04",
      name: isAr ? "الإطلاق" : "Launch",
      desc: isAr
        ? "الإطلاق المدروس، والتعلم من الاستخدام، وتحسين ما يهم حقًا."
        : "Release thoughtfully, learn from use, and improve what matters.",
    },
  ]

  return (
    <main>
      {/* 1. HERO SECTION */}
      <section className="hero">
        <div className="hero-index">{heroIndex}</div>
        <h1>
          <span>{heroTitleA}</span>
          <span className="accent-line">{heroTitleB}</span>
        </h1>
        <div className="hero-meta">
          <p>{heroCopy}</p>
          <div className="hero-links">
            <Action to={`${prefix}/projects`}>{workCtaText}</Action>
            <Action to={`${prefix}/contact`}>{startCtaText}</Action>
          </div>
        </div>
      </section>

      {/* 2. SHOWCASE STAGE */}
      <section className="showcase reveal">
        <ProductStage />
      </section>

      {/* 3. SELECTED WORK SECTION */}
      <section id="selected-work" className="work-section page-pad">
        <SectionHead
          label={isAr ? "أعمال مختارة" : "Selected work"}
          title={isAr ? "منتجات رقمية لها عمل حقيقي لتنجزه." : "Digital products with real work to do."}
        />

        <article className="work-feature reveal">
          <div className="work-copy">
            <span className="eyebrow">INHERITIX PRODUCT · LOGISTICS</span>
            <h3>LOGISTTEX</h3>
            <p>
              {isAr
                ? "منصة عمليات لوجستية تحول الشحنات والمركبات والأداء إلى صورة واحدة واضحة."
                : "A logistics operations platform that turns shipments, fleets, and performance into one clear picture."}
            </p>
            <Action to={`${prefix}/products/logisttex`}>
              {isAr ? "اكتشف المنتج" : "View product"}
            </Action>
          </div>
          <div className="work-visual logisttex">
            <Dashboard />
          </div>
        </article>

        <div className="work-pair">
          <article className="mini-project reveal">
            <div className="mini-visual menu-visual">
              <MenuPhone />
            </div>
            <span className="eyebrow">INHERITIX PRODUCT · HOSPITALITY</span>
            <h3>Fen El Menu</h3>
            <p>
              {isAr
                ? "طلب رقمي أنيق يبسّط الاختيار ويجعل إدارة القائمة أسرع."
                : "A refined ordering experience that makes choosing simple and menu management faster."}
            </p>
            <Action to={`${prefix}/products/fen-el-menu`}>
              {isAr ? "اكتشف المنتج" : "View product"}
            </Action>
          </article>

          <article className="mini-project reveal shift">
            <div className="mini-visual system-visual">
              <div className="system-type">01—06</div>
              <div className="system-ring" />
              <p>
                Systems that fit
                <br />
                the business.
              </p>
            </div>
            <span className="eyebrow">CAPABILITY STORY · CUSTOM SOFTWARE</span>
            <h3>{isAr ? "مصمم للعمل الفعلي" : "Built around the work"}</h3>
            <p>
              {isAr
                ? "نحوّل سير العمل المعقد إلى أدوات واضحة يمكن للفِرق الاعتماد عليها."
                : "We turn complex workflows into clear tools that teams can rely on."}
            </p>
            <Action to={`${prefix}/projects/operations-platform`}>
              {isAr ? "اقرأ القصة" : "Read the story"}
            </Action>
          </article>
        </div>
      </section>

      {/* 4. CAPABILITIES SECTION */}
      <section className="capabilities page-pad">
        <SectionHead
          label={isAr ? "قدراتنا" : "Capabilities"}
          title={isAr ? "من الفكرة إلى نظام يعمل." : "From first idea to working system."}
        />
        <div className="service-list">
          {services.map((service) => {
            const slug = service.slug as string
            const number = (service.number as string) || "01"
            const title = (service.title as string) || slug
            const desc = (service.shortDescription as string) || ""
            return (
              <Link
                key={slug}
                href={`${prefix}/services/${slug}`}
                className="service-row reveal"
              >
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <i>
                  <Arrow />
                </i>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 5. PRODUCTS DARK SECTION */}
      <section className="products-dark">
        <div className="page-pad">
          <SectionHead
            label={isAr ? "منتجاتنا" : "Our products"}
            title={isAr ? "برمجيات نؤمن بها ونبنيها." : "Software we believe in—and build."}
          />
          <div className="product-split">
            <div className="product-copy reveal">
              <span>01 / LOGISTTEX</span>
              <h3>{isAr ? "كل عملية. مرئية." : "Every operation. Visible."}</h3>
              <p>
                {isAr
                  ? "تنسيق الطلبات والأسطول والسائقين والفواتير من مساحة تشغيل واحدة."
                  : "Coordinate orders, fleet, drivers, and billing from one operational workspace."}
              </p>
              <Action to={`${prefix}/products/logisttex`} light>
                {isAr ? "تفاصيل LOGISTTEX" : "Explore LOGISTTEX"}
              </Action>
            </div>
            <div className="dark-dashboard reveal">
              <Dashboard />
            </div>
          </div>
          <div className="product-split reverse">
            <div className="product-copy reveal">
              <span>02 / FEN EL MENU</span>
              <h3>
                {isAr
                  ? "من القائمة إلى الطلب، بسلاسة."
                  : "From menu to order, beautifully."}
              </h3>
              <p>
                {isAr
                  ? "تجربة قائمة وطلب مرنة للمطاعم التي تهتم بكل تفصيل."
                  : "A flexible menu and ordering experience for restaurants that care about every detail."}
              </p>
              <Action to={`${prefix}/products/fen-el-menu`} light>
                {isAr ? "تفاصيل Fen El Menu" : "Explore Fen El Menu"}
              </Action>
            </div>
            <div className="menu-cluster reveal">
              <MenuPhone />
              <MenuPhone />
            </div>
          </div>
        </div>
      </section>

      {/* 6. APPROACH SECTION */}
      <section className="approach page-pad">
        <SectionHead
          label={isAr ? "منهجيتنا" : "Our approach"}
          title={isAr ? "أربع مراحل. فريق واحد." : "Four phases. One connected team."}
        />
        <div className="approach-grid">
          {approachPhases.map((phase) => (
            <div className="approach-item reveal" key={phase.number}>
              <span>{phase.number}</span>
              <h3>{phase.name}</h3>
              <p>{phase.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PERSPECTIVE SECTION */}
      <section className="perspective">
        <div className="perspective-image">
          <img
            src="https://images.unsplash.com/photo-1624012040540-55a09b58686b?auto=format&fit=crop&w=1400&q=85"
            alt={isAr ? "واجهة معمارية هندسية باللونين الأزرق والأبيض" : "Geometric blue and white architectural facade"}
          />
        </div>
        <div className="perspective-copy reveal">
          <span className="eyebrow">{isAr ? "وجهة نظرنا" : "Our perspective"}</span>
          <h2>
            {isAr
              ? "الجمال ليس طبقة أخيرة. إنه طريقة تفكير."
              : "Beauty isn’t the final layer. It’s a way of thinking."}
          </h2>
          <p>
            {isAr
              ? "نحن فريق تصميم وهندسة واحد. نعتقد أن البرمجيات الأفضل تجعل التعقيد مفهومًا والعمل اليومي أكثر إنسانية."
              : "We are one design and engineering team. We believe the best software makes complexity understandable—and everyday work more human."}
          </p>
          <Action to={`${prefix}/about`}>
            {isAr ? "تعرف علينا" : "About Inheritix"}
          </Action>
        </div>
      </section>

      {/* 8. INSIGHTS PREVIEW SECTION */}
      <section className="insights page-pad">
        <SectionHead
          label={isAr ? "وجهة نظرنا" : "Our perspective"}
          title={isAr ? "أفكار للعمل الرقمي الأفضل." : "Thinking for better digital work."}
        />
        <div className="article-grid">
          {posts.slice(0, 3).map((article, index) => {
            const slug = article.slug as string
            const color = (article.color as string) || "ink"
            const categoryLabel = (article.categoryLabel as string) || "PRODUCT THINKING"
            const title = (article.title as string) || slug
            const readTime = (article.readTime as string) || "7 min read"
            return (
              <Link
                key={slug}
                href={`${prefix}/insights/${slug}`}
                className="article-card reveal"
              >
                <div className={`article-art ${color}`}>
                  <span>0{index + 1}</span>
                  <i />
                </div>
                <span className="eyebrow">{categoryLabel}</span>
                <h3>{title}</h3>
                <div className="article-meta">
                  <span>{readTime}</span>
                  <Arrow />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
