"use client"

import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { projectFixtures } from "@/content/development-fixtures"
import type { Project, ProjectContentBlock } from "@/content/types"

type Lang = "en" | "ar"
type RouteProps = { lang: Lang; navigate: (path: string) => void }

const LanguageContext = createContext<Lang>("en")

function stripLocale(path: string) {
  if (path === "/ar") return "/"
  return path.startsWith("/ar/") ? path.slice(3) || "/" : path
}

function localizedPath(path: string, lang: Lang) {
  const [pathname, query = ""] = path.split("?")
  const normalized = stripLocale(pathname || "/")
  const localized = lang === "ar" ? `/ar${normalized === "/" ? "" : normalized}` : normalized
  return query ? `${localized}?${query}` : localized
}

const copy = {
  en: {
    nav: ["Services", "Products", "Projects", "About", "Insights", "Contact"],
    heroA: "Beautifully designed.",
    heroB: "Seriously engineered.",
    heroCopy:
      "We build software that makes complex businesses easier to run—and digital products people enjoy using.",
    work: "Explore Our Work",
    start: "Start a Project",
    selected: "Selected work",
    capabilities: "Capabilities",
    products: "Our products",
    approach: "Our approach",
    perspective: "Our perspective",
    invitation: "Let’s make something worth using.",
    inquiry: "Tell us what you’re building",
  },
  ar: {
    nav: ["الخدمات", "المنتجات", "المشاريع", "عن الشركة", "الرؤى", "تواصل معنا"],
    heroA: "مصمم بإتقان.",
    heroB: "مُهندَس بجدية.",
    heroCopy:
      "نبني برمجيات تجعل الأعمال المعقدة أسهل في الإدارة، ومنتجات رقمية يستمتع الناس باستخدامها.",
    work: "استكشف أعمالنا",
    start: "ابدأ مشروعك",
    selected: "أعمال مختارة",
    capabilities: "قدراتنا",
    products: "منتجاتنا",
    approach: "منهجيتنا",
    perspective: "وجهة نظرنا",
    invitation: "لنصنع شيئًا يستحق الاستخدام.",
    inquiry: "حدثنا عما تريد بناءه",
  },
}

const navPaths = [
  "/services",
  "/products",
  "/projects",
  "/about",
  "/insights",
  "/contact",
]

function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      className={reverse ? "arrow reverse" : "arrow"}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path d="M3 9h11M10 4l5 5-5 5" />
    </svg>
  )
}

function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

function LinkTo({
  to,
  navigate,
  children,
  className = "",
  onClick,
  current = false,
}: {
  to: string
  navigate: (path: string) => void
  children: ReactNode
  className?: string
  onClick?: () => void
  current?: boolean
}) {
  const lang = useContext(LanguageContext)
  return (
    <a
      href={localizedPath(to, lang)}
      className={className}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}

function Action({
  to,
  navigate,
  children,
  light = false,
}: {
  to: string
  navigate: (path: string) => void
  children: ReactNode
  light?: boolean
}) {
  return (
    <LinkTo
      to={to}
      navigate={navigate}
      className={`action ${light ? "action-light" : ""}`}
    >
      <span>{children}</span>
      <Arrow />
    </LinkTo>
  )
}

function Header({
  lang,
  setLang,
  navigate,
  path,
}: RouteProps & { setLang: (lang: Lang) => void; path: string }) {
  const [open, setOpen] = useState(false)
  const progress = useRef<HTMLDivElement>(null)
  const t = copy[lang]

  useEffect(() => {
    const updateProgress = () => {
      const available =
        document.documentElement.scrollHeight - window.innerHeight
      const amount = available > 0 ? window.scrollY / available : 0
      progress.current?.style.setProperty("--scroll-progress", `${amount}`)
    }
    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })
    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.body.classList.toggle("menu-is-open", open)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.classList.remove("menu-is-open")
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  return (
    <header className={`site-header ${open ? "menu-open" : ""}`}>
      <div className="scroll-progress" ref={progress} aria-hidden="true" />
      <LinkTo
        to="/"
        navigate={navigate}
        className="brand"
        onClick={() => setOpen(false)}
      >
        <Mark />
        <strong>INHERITIX</strong>
      </LinkTo>
      {open && (
        <button
          type="button"
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <nav className={open ? "nav open" : "nav"} aria-label="Main navigation">
        {t.nav.map((item, index) => (
          <LinkTo
            key={item}
            to={navPaths[index]}
            navigate={navigate}
            onClick={() => setOpen(false)}
            current={
              path === navPaths[index] ||
              path.startsWith(`${navPaths[index]}/`)
            }
            className={
              path === navPaths[index] ||
              path.startsWith(`${navPaths[index]}/`)
                ? "active"
                : ""
            }
          >
            {item}
          </LinkTo>
        ))}
      </nav>
      <div className="header-actions">
        <button
          type="button"
          className="lang"
          aria-label="Change language"
          onClick={() => {
            setLang(lang === "en" ? "ar" : "en")
            setOpen(false)
          }}
        >
          {lang === "en" ? "العربية" : "EN"}
        </button>
        <LinkTo to="/contact" navigate={navigate} className="header-cta">
          {t.start}
          <Arrow />
        </LinkTo>
        <button
          type="button"
          className="menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}

function Footer({ lang, navigate }: RouteProps) {
  const t = copy[lang]
  return (
    <footer className="footer">
      <div className="footer-lead reveal">
        <p className="eyebrow">
          {lang === "en" ? "Have a project in mind?" : "لديك مشروع في ذهنك؟"}
        </p>
        <h2>{t.invitation}</h2>
        <Action to="/contact" navigate={navigate} light>
          {t.inquiry}
        </Action>
      </div>
      <div className="footer-bottom">
        <LinkTo to="/" navigate={navigate} className="brand brand-light">
          <Mark />
          <strong>INHERITIX</strong>
        </LinkTo>
        <div className="footer-nav">
          {t.nav.map((item, index) => (
            <LinkTo key={item} to={navPaths[index]} navigate={navigate}>
              {item}
            </LinkTo>
          ))}
        </div>
        <div className="legal">
          <span>Amman, Jordan</span>
          <span>© {new Date().getFullYear()} INHERITIX Technologies</span>
        </div>
      </div>
    </footer>
  )
}

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dash-sidebar">
        <Mark />
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={i === 0 ? "active" : ""} />
        ))}
      </div>
      <div className="dash-main">
        <div className="dash-top">
          <div>
            <small>Good morning</small>
            <b>Operations overview</b>
          </div>
          <span className="avatar">AK</span>
        </div>
        <div className="metric-row">
          <div>
            <small>Active shipments</small>
            <b>248</b>
            <em>+12.4%</em>
          </div>
          <div>
            <small>On-time delivery</small>
            <b>96.8%</b>
            <em>+2.1%</em>
          </div>
          <div>
            <small>Fleet utilization</small>
            <b>84%</b>
            <em>Live</em>
          </div>
        </div>
        <div className="chart-area">
          <div className="chart-heading">
            <b>Shipment performance</b>
            <small>Last 30 days</small>
          </div>
          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            aria-label="Performance chart"
          >
            <defs>
              <linearGradient id="chartfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#00CCFF" stopOpacity=".32" />
                <stop offset="1" stopColor="#00CCFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="area"
              d="M0,150 C70,130 100,145 155,92 C210,40 250,120 315,74 C390,20 420,95 480,58 C530,30 565,45 600,18 L600,180 L0,180Z"
            />
            <path
              className="line"
              d="M0,150 C70,130 100,145 155,92 C210,40 250,120 315,74 C390,20 420,95 480,58 C530,30 565,45 600,18"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

function MenuPhone() {
  return (
    <div className="phone">
      <div className="phone-top">
        <span>9:41</span>
        <i />
      </div>
      <div className="food-photo">
        <div className="plate">
          <span>FEN</span>
        </div>
      </div>
      <div className="phone-copy">
        <small>CHEF’S SPECIAL</small>
        <b>Roasted herb bowl</b>
        <p>Seasonal vegetables, labneh, za’atar oil</p>
        <div className="price">
          <strong>7.50 JD</strong>
          <span>＋</span>
        </div>
      </div>
    </div>
  )
}

function ProductStage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "product-stage compact" : "product-stage"}>
      <div className="stage-grid" />
      <div className="stage-label">
        <span>01</span> LOGISTICS, IN MOTION
      </div>
      <div className="dashboard-wrap">
        <Dashboard />
      </div>
      <div className="phone-wrap">
        <MenuPhone />
      </div>
      <div className="stage-note">Two products. One standard: clarity.</div>
    </div>
  )
}

const services = [
  [
    "01",
    "Custom software",
    "Purpose-built systems shaped around the way your business actually works.",
  ],
  [
    "02",
    "SaaS platforms",
    "Scalable products designed for adoption, retention, and continuous evolution.",
  ],
  [
    "03",
    "ERP & business systems",
    "Connected operations, clear data, and fewer manual handoffs.",
  ],
  [
    "04",
    "Mobile applications",
    "Focused native-feeling experiences for people on the move.",
  ],
  [
    "05",
    "AI automation",
    "Practical automation for repetitive decisions, workflows, and support.",
  ],
  [
    "06",
    "WordPress development",
    "Fast, flexible publishing systems engineered beyond the template.",
  ],
]

function SectionHead({ label, title }: { label: string; title?: string }) {
  return (
    <div className="section-head reveal">
      <span>{label}</span>
      {title && <h2>{title}</h2>}
    </div>
  )
}

function Home({ lang, navigate }: RouteProps) {
  const t = copy[lang]
  const isAr = lang === "ar"
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-index">INH—01 / DIGITAL PRODUCTS</div>
          <h1>
            <span>{t.heroA}</span>
            <span className="accent-line">{t.heroB}</span>
          </h1>
          <div className="hero-meta">
            <p>{t.heroCopy}</p>
            <div className="hero-links">
              <Action to="/projects" navigate={navigate}>
                {t.work}
              </Action>
              <Action to="/contact" navigate={navigate}>
                {t.start}
              </Action>
            </div>
          </div>
        </section>
        <section className="showcase reveal">
          <ProductStage />
        </section>

        <section id="selected-work" className="work-section page-pad">
          <SectionHead
            label={t.selected}
            title={
              isAr
                ? "منتجات رقمية لها عمل حقيقي لتنجزه."
                : "Digital products with real work to do."
            }
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
              <Action to="/products/logisttex" navigate={navigate}>
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
              <Action to="/products/fen-el-menu" navigate={navigate}>
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
              <span className="eyebrow">
                CAPABILITY STORY · CUSTOM SOFTWARE
              </span>
              <h3>{isAr ? "مصمم للعمل الفعلي" : "Built around the work"}</h3>
              <p>
                {isAr
                  ? "نحوّل سير العمل المعقد إلى أدوات واضحة يمكن للفِرق الاعتماد عليها."
                  : "We turn complex workflows into clear tools that teams can rely on."}
              </p>
              <Action to="/projects/operations-platform" navigate={navigate}>
                {isAr ? "اقرأ القصة" : "Read the story"}
              </Action>
            </article>
          </div>
        </section>

        <section className="capabilities page-pad">
          <SectionHead
            label={t.capabilities}
            title={
              isAr
                ? "من الفكرة إلى نظام يعمل."
                : "From first idea to working system."
            }
          />
          <div className="service-list">
            {services.map(([number, name, desc]) => (
              <LinkTo
                key={name}
                to={`/services/${name.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`}
                navigate={navigate}
                className="service-row reveal"
              >
                <span>{number}</span>
                <h3>{name}</h3>
                <p>{desc}</p>
                <i>
                  <Arrow />
                </i>
              </LinkTo>
            ))}
          </div>
        </section>

        <section className="products-dark">
          <div className="page-pad">
            <SectionHead
              label={t.products}
              title={
                isAr
                  ? "برمجيات نؤمن بها ونبنيها."
                  : "Software we believe in—and build."
              }
            />
            <div className="product-split">
              <div className="product-copy reveal">
                <span>01 / LOGISTTEX</span>
                <h3>
                  {isAr ? "كل عملية. مرئية." : "Every operation. Visible."}
                </h3>
                <p>
                  {isAr
                    ? "تنسيق الطلبات والأسطول والسائقين والفواتير من مساحة تشغيل واحدة."
                    : "Coordinate orders, fleet, drivers, and billing from one operational workspace."}
                </p>
                <Action to="/products/logisttex" navigate={navigate} light>
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
                <Action to="/products/fen-el-menu" navigate={navigate} light>
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

        <section className="approach page-pad">
          <SectionHead
            label={t.approach}
            title={
              isAr
                ? "أربع مراحل. فريق واحد."
                : "Four phases. One connected team."
            }
          />
          <div className="approach-grid">
            {[
              [
                "01",
                "Discovery",
                "Define the problem, users, constraints, and measure of success.",
              ],
              [
                "02",
                "Design",
                "Make workflows tangible, test the hard parts, and shape the system.",
              ],
              [
                "03",
                "Engineering",
                "Build with resilient architecture and disciplined delivery.",
              ],
              [
                "04",
                "Launch",
                "Release thoughtfully, learn from use, and improve what matters.",
              ],
            ].map(([number, name, desc]) => (
              <div className="approach-item reveal" key={name}>
                <span>{number}</span>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="perspective">
          <div className="perspective-image">
            <img
              src="https://images.unsplash.com/photo-1624012040540-55a09b58686b?auto=format&fit=crop&w=1400&q=85"
              alt="Geometric blue and white architectural facade"
            />
          </div>
          <div className="perspective-copy reveal">
            <span className="eyebrow">{t.perspective}</span>
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
            <Action to="/about" navigate={navigate}>
              {isAr ? "تعرف علينا" : "About Inheritix"}
            </Action>
          </div>
        </section>

        <InsightsPreview lang={lang} navigate={navigate} />
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

const articles = [
  {
    slug: "software-people-adopt",
    type: "PRODUCT THINKING",
    title: "How to build business software people actually adopt",
    date: "7 min read",
    color: "ink",
  },
  {
    slug: "automation-with-judgment",
    type: "AI & AUTOMATION",
    title: "Automation needs judgment, not just a model",
    date: "6 min read",
    color: "blue",
  },
  {
    slug: "designing-operational-clarity",
    type: "DESIGN",
    title: "Designing for operational clarity",
    date: "9 min read",
    color: "cyan",
  },
]

function InsightsPreview({ lang, navigate }: RouteProps) {
  return (
    <section className="insights page-pad">
      <SectionHead
        label={copy[lang].perspective}
        title={
          lang === "ar"
            ? "أفكار للعمل الرقمي الأفضل."
            : "Thinking for better digital work."
        }
      />
      <div className="article-grid">
        {articles.map((article, index) => (
          <LinkTo
            key={article.slug}
            to={`/insights/${article.slug}`}
            navigate={navigate}
            className="article-card reveal"
          >
            <div className={`article-art ${article.color}`}>
              <span>0{index + 1}</span>
              <i />
            </div>
            <span className="eyebrow">{article.type}</span>
            <h3>{article.title}</h3>
            <div className="article-meta">
              <span>{article.date}</span>
              <Arrow />
            </div>
          </LinkTo>
        ))}
      </div>
    </section>
  )
}

function PageHero({
  kicker,
  title,
  intro,
}: {
  kicker: string
  title: string
  intro: string
}) {
  return (
    <section className="page-hero page-pad">
      <span className="eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{intro}</p>
    </section>
  )
}

function ServicesPage({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <PageHero
          kicker="SERVICES / 01—06"
          title={
            lang === "ar"
              ? "برمجيات تحل العمل الصعب."
              : "Software for the hard parts of work."
          }
          intro={
            lang === "ar"
              ? "من منتج جديد إلى نظام أعمال أساسي، نجمع بين التفكير بالمنتج والتصميم والهندسة."
              : "From a new digital product to a core business system, we bring product thinking, design, and engineering together."
          }
        />
        <section className="services-editorial page-pad">
          {services.map(([number, name, desc], index) => (
            <article className="service-editorial reveal" key={name}>
              <div className={`service-art art-${index + 1}`}>
                <span>{number}</span>
                <i />
              </div>
              <div className="service-detail">
                <span>{number}</span>
                <h2>{name}</h2>
                <p>
                  {desc} We map the real constraints, design for the people
                  doing the work, and engineer for change.
                </p>
                <Action
                  to={`/services/${name.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`}
                  navigate={navigate}
                >
                  See service
                </Action>
              </div>
            </article>
          ))}
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ServiceDetail({
  lang,
  navigate,
  slug,
}: RouteProps & { slug: string }) {
  const found =
    services.find(
      (s) =>
        s[1].toLowerCase().replaceAll(" ", "-").replace("&", "and") === slug,
    ) || services[0]
  const title = found[1]
  return (
    <>
      <main>
        <PageHero
          kicker={`SERVICE ${found[0]}`}
          title={title}
          intro={`We design and engineer ${title.toLowerCase()} that reduce friction, create visibility, and are built to evolve with your business.`}
        />
        <div className="detail-stage">
          <div className="detail-orbit">
            <span>{found[0]}</span>
            <i />
            <i />
            <i />
          </div>
        </div>
        <section className="detail-body page-pad">
          <aside>
            <span>ON THIS PAGE</span>
            <a href="#problem">The problem</a>
            <a href="#deliverables">Deliverables</a>
            <a href="#process">Process</a>
            <a href="#next">Next step</a>
          </aside>
          <div>
            <article id="problem">
              <span className="eyebrow">THE PROBLEM</span>
              <h2>Complexity should serve the business—not slow it down.</h2>
              <p>
                Disconnected tools and inherited processes create duplicate work
                and unreliable decisions. We begin by understanding where the
                friction really lives: in the workflow, the data, or the
                interface between both.
              </p>
            </article>
            <article id="deliverables">
              <span className="eyebrow">WHAT WE DELIVER</span>
              <h2>A complete path from decision to working software.</h2>
              <ul>
                <li>Product and technical strategy</li>
                <li>User journeys and service blueprints</li>
                <li>Interface design and interactive prototypes</li>
                <li>Production engineering and integrations</li>
                <li>Quality assurance and launch support</li>
              </ul>
            </article>
            <article id="process">
              <span className="eyebrow">HOW WE WORK</span>
              <h2>Senior attention, visible progress.</h2>
              <p>
                A focused cross-functional team works in short, transparent
                cycles. Every cycle produces something tangible to review, test,
                and improve—so important decisions happen with evidence.
              </p>
            </article>
            <article id="next">
              <span className="eyebrow">NEXT STEP</span>
              <h2>Start with the problem, not a feature list.</h2>
              <Action to="/contact" navigate={navigate}>
                Discuss your project
              </Action>
            </article>
          </div>
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ProductsPage({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <PageHero
          kicker="INHERITIX PRODUCTS"
          title={
            lang === "ar"
              ? "منتجات صنعتها خبرة حقيقية."
              : "Products shaped by real operations."
          }
          intro="We build and own focused software products for industries where clarity, speed, and a dependable workflow matter."
        />
        <section className="products-index page-pad">
          <article className="product-index-item reveal">
            <div>
              <span className="eyebrow">01 / LOGISTICS OPERATIONS</span>
              <h2>LOGISTTEX</h2>
              <p>
                Plan shipments, coordinate fleets, track execution, and
                understand performance—without stitching together a dozen tools.
              </p>
              <Action to="/products/logisttex" navigate={navigate}>
                Explore LOGISTTEX
              </Action>
            </div>
            <div className="index-visual blue">
              <Dashboard />
            </div>
          </article>
          <article className="product-index-item reverse reveal">
            <div>
              <span className="eyebrow">02 / RESTAURANT EXPERIENCE</span>
              <h2>Fen El Menu</h2>
              <p>
                A beautiful digital menu and ordering flow that is effortless
                for guests and practical for restaurant teams.
              </p>
              <Action to="/products/fen-el-menu" navigate={navigate}>
                Explore Fen El Menu
              </Action>
            </div>
            <div className="index-visual coral">
              <MenuPhone />
            </div>
          </article>
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ProductDetail({
  lang,
  navigate,
  product,
}: RouteProps & { product: "logisttex" | "fen" }) {
  const logistics = product === "logisttex"
  const title = logistics ? "LOGISTTEX" : "Fen El Menu"
  return (
    <>
      <main
        className={logistics ? "product-page logistics" : "product-page fen"}
      >
        <section className="product-hero page-pad">
          <span className="eyebrow">
            INHERITIX PRODUCT / {logistics ? "LOGISTICS" : "HOSPITALITY"}
          </span>
          <h1>
            {logistics
              ? "Logistics, under control."
              : "A better way to browse, choose, and order."}
          </h1>
          <p>
            {logistics
              ? "One operational system for orders, fleets, drivers, costs, and the decisions between them."
              : "A flexible digital menu designed to make ordering feel natural—and menu operations feel manageable."}
          </p>
          <Action to="/contact?type=demo" navigate={navigate}>
            Request a demo
          </Action>
        </section>
        <div className="product-hero-visual">
          {logistics ? (
            <Dashboard />
          ) : (
            <div className="phones">
              <MenuPhone />
              <MenuPhone />
              <MenuPhone />
            </div>
          )}
        </div>
        <section className="value-strip page-pad">
          {[
            logistics
              ? ["ONE VIEW", "See the operation as it happens."]
              : ["EASY CHOICE", "Readable menus, modifiers, and details."],
            logistics
              ? ["LESS CHASING", "Keep teams and drivers coordinated."]
              : ["FASTER UPDATES", "Change items and availability centrally."],
            logistics
              ? ["BETTER SIGNAL", "Turn activity into useful decisions."]
              : [
                  "BRAND-READY",
                  "An experience that feels like your restaurant.",
                ],
          ].map(([a, b]) => (
            <div key={a}>
              <span>{a}</span>
              <p>{b}</p>
            </div>
          ))}
        </section>
        <section className="workflow page-pad">
          <SectionHead
            label="CORE WORKFLOW"
            title={
              logistics
                ? "From order to proof of delivery."
                : "From discovery to a confirmed order."
            }
          />
          <div className="workflow-line">
            {(logistics
              ? ["Capture", "Plan", "Dispatch", "Track", "Settle"]
              : ["Browse", "Customize", "Review", "Order", "Enjoy"]
            ).map((step, i) => (
              <div key={step}>
                <span>0{i + 1}</span>
                <b>{step}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="interface-tour page-pad">
          <SectionHead
            label="INTERFACE TOUR"
            title="The information you need. Nothing you don’t."
          />
          <div className="tour-large">
            {logistics ? <Dashboard /> : <MenuPhone />}
          </div>
          <div className="tour-copy">
            <h3>
              {logistics
                ? "Operational visibility without the noise."
                : "A menu that helps the food speak."}
            </h3>
            <p>
              Every screen is organized around the next useful decision. Clear
              hierarchy, relevant context, and responsive interaction keep the
              experience focused.
            </p>
          </div>
        </section>
        <Faq logistics={logistics} />
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function Faq({ logistics }: { logistics: boolean }) {
  const questions = logistics
    ? [
        "Who is LOGISTTEX for?",
        "Can it fit our current workflow?",
        "Does it support integrations?",
        "How do we start?",
      ]
    : [
        "What kind of restaurants is it for?",
        "Can it match our brand?",
        "Can we manage availability?",
        "How do we request a demo?",
      ]
  return (
    <section className="faq page-pad">
      <SectionHead label="FAQ" title="Questions, answered." />
      {questions.map((q, i) => (
        <details key={q}>
          <summary>
            {q}
            <span>＋</span>
          </summary>
          <p>
            {i === 0
              ? "It is designed for growing teams that need a clearer, more dependable digital workflow."
              : "The product is configurable. We begin with a short discovery session, then show how it can support your current operation and priorities."}
          </p>
        </details>
      ))}
    </section>
  )
}

function AboutPage({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <PageHero
          kicker="ABOUT INHERITIX"
          title={
            lang === "ar"
              ? "استوديو منتج. عقلية هندسية."
              : "Product-studio confidence. Engineering-company discipline."
          }
          intro="INHERITIX Technologies designs and builds digital products, operational systems, and platforms for businesses ready to work better."
        />
        <section className="about-image">
          <img
            src="https://images.unsplash.com/photo-1624012040629-a408026c0d3b?auto=format&fit=crop&w=1800&q=85"
            alt="Blue geometric architecture against open sky"
          />
        </section>
        <section className="manifesto page-pad">
          <span className="eyebrow">WHAT WE BELIEVE</span>
          <h2>Software should respect the people who depend on it.</h2>
          <div>
            <p>
              That means understanding the work before proposing the interface.
              Making difficult decisions visible. Building systems that can
              change without becoming fragile.
            </p>
            <p>
              We bring design and engineering into the same conversation from
              day one. The result is not decoration around technology. It is a
              product that feels coherent all the way through.
            </p>
          </div>
        </section>
        <section className="principles page-pad">
          {[
            [
              "01",
              "Clarity over theatre",
              "We make the work and the product understandable.",
            ],
            [
              "02",
              "Useful is beautiful",
              "Aesthetics and function should reinforce one another.",
            ],
            [
              "03",
              "Build for change",
              "Good architecture leaves room for what comes next.",
            ],
            [
              "04",
              "Work in the open",
              "Progress, risks, and decisions stay visible.",
            ],
          ].map(([n, title, p]) => (
            <div className="reveal" key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{p}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function InsightsPage({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <PageHero
          kicker="INSIGHTS"
          title={
            lang === "ar"
              ? "الملاحظات وراء العمل."
              : "The thinking behind the work."
          }
          intro="Practical perspectives on product design, software engineering, automation, and the operational systems between them."
        />
        <InsightsPreview lang={lang} navigate={navigate} />
        <section className="journal-list page-pad">
          {[
            "When an MVP needs architecture",
            "Design systems for operational products",
            "What to automate—and what to leave human",
          ].map((title, i) => (
            <LinkTo
              key={title}
              to={`/insights/${articles[i].slug}`}
              navigate={navigate}
            >
              <span>0{i + 4}</span>
              <h3>{title}</h3>
              <small>STRATEGY · 5 MIN READ</small>
              <Arrow />
            </LinkTo>
          ))}
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ArticlePage({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <article className="article-page">
          <header className="article-header page-pad">
            <span className="eyebrow">PRODUCT THINKING · 7 MIN READ</span>
            <h1>How to build business software people actually adopt</h1>
            <p>
              Adoption is not a training problem. It is the accumulated result
              of product decisions made long before launch.
            </p>
            <div className="byline">
              <div>IN</div>
              <span>
                <b>INHERITIX Editorial</b>
                <small>June 12, 2025</small>
              </span>
            </div>
          </header>
          <figure className="article-cover">
            <div className="cover-type">
              USE
              <br />
              <i>FUL</i>
            </div>
            <figcaption>
              Clarity is a product feature, not a visual preference.
            </figcaption>
          </figure>
          <div className="article-layout page-pad">
            <aside>
              <b>CONTENTS</b>
              <a href="#friction">Start with friction</a>
              <a href="#workflow">Design the workflow</a>
              <a href="#trust">Earn trust</a>
              <a href="#measure">Measure behavior</a>
            </aside>
            <div className="prose">
              <p className="lead">
                Teams do not resist new software because they dislike change.
                They resist software that asks them to carry more complexity
                than it removes.
              </p>
              <h2 id="friction">Start with the friction people already feel</h2>
              <p>
                The first version of a product brief is often a list of
                features. But features are only hypotheses. Begin instead with
                specific moments: the dispatcher who calls three people to
                locate an order, or the manager reconciling two exports before
                every meeting.
              </p>
              <blockquote>
                “Useful software creates a shorter, clearer path between intent
                and outcome.”
              </blockquote>
              <h2 id="workflow">
                Design the whole workflow, not isolated screens
              </h2>
              <p>
                A polished screen can still fail inside a broken sequence. Map
                where information enters, who changes it, what decisions depend
                on it, and where the workflow leaves the product.
              </p>
              <figure>
                <div className="article-diagram">
                  <span>INPUT</span>
                  <i />
                  <span>DECISION</span>
                  <i />
                  <span>OUTCOME</span>
                </div>
                <figcaption>
                  A useful workflow makes handoffs explicit and status easy to
                  understand.
                </figcaption>
              </figure>
              <h2 id="trust">Earn trust in small moments</h2>
              <p>
                Trust grows from predictable behavior: clear states, reversible
                actions, useful validation, and language that matches how the
                team speaks. Reliability is experienced through details.
              </p>
              <h2 id="measure">Measure behavior, not launch</h2>
              <p>
                Launch is the beginning of evidence. Look at completion,
                workarounds, abandonment, repeated support questions, and the
                time between key steps. Each reveals where the product still
                asks too much.
              </p>
              <div className="context-link">
                <span>BUILDING AN OPERATIONAL PRODUCT?</span>
                <h3>We can help make the workflow clear.</h3>
                <Action to="/contact" navigate={navigate}>
                  Talk to our team
                </Action>
              </div>
            </div>
          </div>
        </article>
        <InsightsPreview lang={lang} navigate={navigate} />
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function CaseStudy({ lang, navigate }: RouteProps) {
  return (
    <>
      <main>
        <PageHero
          kicker="CAPABILITY STORY / CUSTOM SOFTWARE"
          title="Turning an operational maze into one clear system."
          intro="An illustrative look at how INHERITIX approaches complex business workflows—from discovery through a dependable product foundation."
        />
        <section className="case-stage">
          <Dashboard />
        </section>
        <section className="case-summary page-pad">
          <div>
            <span>CHALLENGE</span>
            <p>
              Critical work spread across disconnected tools, informal messages,
              and duplicated records.
            </p>
          </div>
          <div>
            <span>APPROACH</span>
            <p>
              Map the operation, define the source of truth, and prototype the
              highest-risk workflows first.
            </p>
          </div>
          <div>
            <span>DELIVERABLES</span>
            <p>
              Product strategy, UX system, interface design, application
              engineering, and launch planning.
            </p>
          </div>
        </section>
        <section className="case-narrative page-pad">
          <span className="eyebrow">THE WORK</span>
          <h2>Make the system match the mental model.</h2>
          <p>
            Instead of digitizing every existing step, we identify the intent
            behind the work. Then we remove duplication, surface exceptions, and
            organize the interface around the decisions each role needs to make.
          </p>
          <div className="case-art">
            <span>MAP</span>
            <i />
            <span>TEST</span>
            <i />
            <span>BUILD</span>
          </div>
          <h2>Prototype where uncertainty is highest.</h2>
          <p>
            Complex products become easier to build when the hard questions are
            made visible early. Interactive prototypes let teams validate
            terminology, permissions, edge cases, and workflow before
            engineering effort compounds.
          </p>
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function FixtureNotice({ lang }: { lang: Lang }) {
  return (
    <div className="fixture-notice" role="note">
      <strong>{lang === "ar" ? "نموذج تطوير" : "Development fixture"}</strong>
      <span>
        {lang === "ar"
          ? "محتوى توضيحي لا يمثل عملاً معتمدًا لعميل."
          : "Illustrative content — not approved or published client work."}
      </span>
    </div>
  )
}

function ProjectCard({
  project,
  lang,
  navigate,
}: {
  project: Project
  lang: Lang
  navigate: (path: string) => void
}) {
  return (
    <article className="project-card reveal">
      <LinkTo
        to={`/projects/${project.slug}`}
        navigate={navigate}
        className="project-card-visual"
      >
        <img
          src={project.cardImage.src}
          alt={project.cardImage.alt[lang]}
          width={project.cardImage.width}
          height={project.cardImage.height}
        />
      </LinkTo>
      <div className="project-card-meta">
        <span>{project.sector[lang]}</span>
        <span>{project.year}</span>
      </div>
      <h2>
        <LinkTo to={`/projects/${project.slug}`} navigate={navigate}>
          {project.title[lang]}
        </LinkTo>
      </h2>
      <p>{project.summary[lang]}</p>
      <Action to={`/projects/${project.slug}`} navigate={navigate}>
        {lang === "ar" ? "عرض المشروع" : "View project"}
      </Action>
    </article>
  )
}

function ProjectsPage({ lang, navigate }: RouteProps) {
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)
  const filters = [
    { value: "all", en: "All projects", ar: "كل المشاريع" },
    { value: "Enterprise operations", en: "Operations", ar: "العمليات" },
    { value: "Digital services", en: "Digital services", ar: "الخدمات الرقمية" },
  ]
  const visible = projectFixtures.filter(
    (project) => filter === "all" || project.sector.en === filter,
  )

  return (
    <>
      <main>
        <PageHero
          kicker={lang === "ar" ? "المشاريع" : "PROJECTS"}
          title={
            lang === "ar"
              ? "أنظمة رقمية مصممة للعمل الحقيقي."
              : "Digital systems designed for real work."
          }
          intro={
            lang === "ar"
              ? "تخطيطات جاهزة لعرض المشاريع المنشورة بعد ربط Payload."
              : "Production-ready layouts for approved projects once Payload is connected."
          }
        />
        <section className="projects-index page-pad" aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="sr-only">
            {lang === "ar" ? "قائمة المشاريع" : "Project list"}
          </h2>
          <FixtureNotice lang={lang} />
          <div className="project-filters reveal" aria-label={lang === "ar" ? "تصفية المشاريع" : "Filter projects"}>
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "active" : ""}
                aria-pressed={filter === item.value}
                onClick={() => {
                  setFilter(item.value)
                  setPage(1)
                }}
              >
                {item[lang]}
              </button>
            ))}
          </div>
          <div className="projects-grid" aria-live="polite">
            {visible.map((project) => (
              <ProjectCard
                key={`${filter}-${project.id}`}
                project={project}
                lang={lang}
                navigate={navigate}
              />
            ))}
          </div>
          <nav className="project-pagination reveal" aria-label={lang === "ar" ? "صفحات المشاريع" : "Project pages"}>
            <button type="button" disabled aria-label={lang === "ar" ? "الصفحة السابقة" : "Previous page"}>
              <Arrow reverse />
            </button>
            <button type="button" className="active" aria-current="page" onClick={() => setPage(1)}>
              {page}
            </button>
            <button type="button" disabled aria-label={lang === "ar" ? "الصفحة التالية" : "Next page"}>
              <Arrow />
            </button>
          </nav>
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ProjectBlock({
  block,
  lang,
  navigate,
}: {
  block: ProjectContentBlock
  lang: Lang
  navigate: (path: string) => void
}) {
  if (block.blockType === "metrics") {
    return (
      <section className="project-metrics reveal">
        {block.items.map((item) => (
          <div key={item.id}>
            <strong>{item.value[lang]}</strong>
            <span>{item.label[lang]}</span>
          </div>
        ))}
      </section>
    )
  }

  if (block.blockType === "image") {
    return (
      <figure className="project-block-image reveal">
        <img
          src={block.image.src}
          alt={block.image.alt[lang]}
          width={block.image.width}
          height={block.image.height}
        />
        {block.caption && <figcaption>{block.caption[lang]}</figcaption>}
      </figure>
    )
  }

  if (block.blockType === "quote") {
    return (
      <figure className="project-quote reveal">
        <blockquote>{block.quote[lang]}</blockquote>
        {block.attribution && <figcaption>{block.attribution[lang]}</figcaption>}
      </figure>
    )
  }

  if (block.blockType === "cta") {
    return (
      <section className="project-block project-block-cta reveal">
        <h2>{block.heading[lang]}</h2>
        {block.body && <p>{block.body[lang]}</p>}
        <Action to={block.action.href[lang]} navigate={navigate} light>
          {block.action.label[lang]}
        </Action>
      </section>
    )
  }

  return (
    <section className="project-block reveal">
      {block.blockType === "intro" && block.eyebrow && (
        <span className="eyebrow">{block.eyebrow[lang]}</span>
      )}
      {block.heading && <h2>{block.heading[lang]}</h2>}
      <p>{block.body[lang]}</p>
    </section>
  )
}

function ProjectDetailPage({
  lang,
  navigate,
  slug,
}: RouteProps & { slug: string }) {
  const project = projectFixtures.find((item) => item.slug === slug)
  if (!project) return <ProjectsPage lang={lang} navigate={navigate} />
  const related = projectFixtures.filter((item) =>
    project.relatedProjectIds.includes(item.id),
  )

  return (
    <>
      <main>
        <section className="project-hero page-pad">
          <FixtureNotice lang={lang} />
          <div className="project-hero-copy reveal">
            <span className="eyebrow">{project.sector[lang]} · {project.year}</span>
            <h1>{project.title[lang]}</h1>
            <p>{project.summary[lang]}</p>
          </div>
          <div className="project-hero-image reveal">
            <img
              src={project.heroImage.src}
              alt={project.heroImage.alt[lang]}
              width={project.heroImage.width}
              height={project.heroImage.height}
            />
          </div>
          <dl className="project-services reveal">
            <div>
              <dt>{lang === "ar" ? "القطاع" : "Sector"}</dt>
              <dd>{project.sector[lang]}</dd>
            </div>
            <div>
              <dt>{lang === "ar" ? "الخدمات" : "Services"}</dt>
              <dd>{project.services.map((service) => service[lang]).join(" · ")}</dd>
            </div>
            <div>
              <dt>{lang === "ar" ? "السنة" : "Year"}</dt>
              <dd>{project.year}</dd>
            </div>
          </dl>
        </section>
        <div className="project-blocks page-pad">
          {project.blocks.map((block) => (
            <ProjectBlock
              key={block.id}
              block={block}
              lang={lang}
              navigate={navigate}
            />
          ))}
        </div>
        {related.length > 0 && (
          <section className="related-projects page-pad">
            <SectionHead
              label={lang === "ar" ? "مشاريع مرتبطة" : "Related projects"}
              title={lang === "ar" ? "استكشف المزيد" : "Continue exploring"}
            />
            <div className="projects-grid projects-grid-related">
              {related.map((item) => (
                <ProjectCard key={item.id} project={item} lang={lang} navigate={navigate} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function ContactPage({ lang, navigate }: RouteProps) {
  const [type, setType] = useState<"project" | "demo" | "general">("project")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  useEffect(() => {
    if (window.location.search.includes("type=demo")) setType("demo")
  }, [])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next: Record<string, string> = {}
    if (!String(data.get("name") || "").trim())
      next.name = "Please add your name."
    if (!/^\S+@\S+\.\S+$/.test(String(data.get("email") || "")))
      next.email = "Enter a valid work email."
    if (!String(data.get("message") || "").trim())
      next.message = "Tell us a little about what you need."
    setErrors(next)
    if (!Object.keys(next).length) setSent(true)
    else
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      })
  }
  return (
    <>
      <main className="contact-page">
        <PageHero
          kicker="START A CONVERSATION"
          title={
            lang === "ar"
              ? "ما الذي يمكننا بناؤه معًا؟"
              : "What can we build together?"
          }
          intro="Choose the conversation that fits. We’ll make sure it reaches the right people."
        />
        <section className="contact-layout page-pad">
          <div className="contact-tabs">
            {([
              ["project", "Project inquiry"],
              ["demo", "Product demo"],
              ["general", "General inquiry"],
            ] as const).map(([value, label]) => (
              <button
                type="button"
                className={type === value ? "active" : ""}
                onClick={() => {
                  setType(value)
                  setSent(false)
                }}
                key={value}
              >
                <span>
                  {value === "project" ? "01" : value === "demo" ? "02" : "03"}
                </span>
                {label}
              </button>
            ))}
          </div>
          {sent ? (
            <div className="confirmation" role="status">
              <span>✓</span>
              <h2>Thank you. We have what we need to start.</h2>
              <p>
                Our team will review your message and respond within two working
                days.
              </p>
              <button type="button" onClick={() => setSent(false)}>
                Send another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="form-intro">
                <span className="eyebrow">{type.toUpperCase()}</span>
                <h2>
                  {type === "project"
                    ? "Tell us about the challenge."
                    : type === "demo"
                      ? "See the product in your workflow."
                      : "How can we help?"}
                </h2>
              </div>
              <label>
                Full name
                <input
                  name="name"
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                />
                  {errors.name && <small role="alert">{errors.name}</small>}
              </label>
              <label>
                Work email
                <input
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                />
                  {errors.email && <small role="alert">{errors.email}</small>}
              </label>
              {type === "demo" && (
                <label>
                  Product
                  <select name="product">
                    <option>LOGISTTEX</option>
                    <option>Fen El Menu</option>
                  </select>
                </label>
              )}
              {type === "project" && (
                <label>
                  What are you considering?
                  <select name="service">
                    <option>Custom software</option>
                    <option>SaaS platform</option>
                    <option>ERP / business system</option>
                    <option>Mobile application</option>
                    <option>AI automation</option>
                    <option>WordPress development</option>
                  </select>
                </label>
              )}
              <label>
                Your message
                <textarea
                  name="message"
                  rows={5}
                  placeholder="A little context helps us prepare..."
                  aria-invalid={!!errors.message}
                />
                  {errors.message && (
                    <small role="alert">{errors.message}</small>
                  )}
              </label>
              <button className="submit" type="submit">
                Send inquiry <Arrow />
              </button>
            </form>
          )}
          <aside className="contact-note">
            <span>DIRECT CONTACT</span>
            <a href="mailto:hello@inheritix.com">hello@inheritix.com</a>
            <p>
              For partnerships, careers, and everything else, use general
              inquiry.
            </p>
          </aside>
        </section>
      </main>
      <Footer lang={lang} navigate={navigate} />
    </>
  )
}

function App({ lang }: { lang: Lang }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const path = stripLocale(pathname)
  const [showTop, setShowTop] = useState(false)
  const top = useRef<HTMLDivElement>(null)
  const navigate = (next: string) => {
    router.push(localizedPath(next, lang))
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })
  }
  const setLang = (nextLang: Lang) => {
    const query = searchParams.toString()
    router.push(localizedPath(`${path}${query ? `?${query}` : ""}`, nextLang))
  }
  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 700)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
  }, [lang])
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible")
        }),
      { threshold: 0.12 },
    )
    const observeReveals = () => {
      document.querySelectorAll(".reveal:not([data-reveal-ready])").forEach((item) => {
        item.setAttribute("data-reveal-ready", "true")
        observer.observe(item)
      })
    }
    observeReveals()
    document.documentElement.classList.add("motion-ready")
    const mutations = new MutationObserver(observeReveals)
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => {
      mutations.disconnect()
      observer.disconnect()
      document.documentElement.classList.remove("motion-ready")
    }
  }, [path, lang])

  let page: ReactNode
  if (path === "/") page = <Home lang={lang} navigate={navigate} />
  else if (path === "/services")
    page = <ServicesPage lang={lang} navigate={navigate} />
  else if (path.startsWith("/services/"))
    page = (
      <ServiceDetail
        lang={lang}
        navigate={navigate}
        slug={path.split("/").pop() || ""}
      />
    )
  else if (path === "/products")
    page = <ProductsPage lang={lang} navigate={navigate} />
  else if (path === "/products/logisttex")
    page = <ProductDetail lang={lang} navigate={navigate} product="logisttex" />
  else if (path === "/products/fen-el-menu")
    page = <ProductDetail lang={lang} navigate={navigate} product="fen" />
  else if (path === "/projects")
    page = <ProjectsPage lang={lang} navigate={navigate} />
  else if (path.startsWith("/projects/"))
    page = (
      <ProjectDetailPage
        lang={lang}
        navigate={navigate}
        slug={path.split("/").pop() || ""}
      />
    )
  else if (path === "/about")
    page = <AboutPage lang={lang} navigate={navigate} />
  else if (path === "/insights")
    page = <InsightsPage lang={lang} navigate={navigate} />
  else if (path.startsWith("/insights/"))
    page = <ArticlePage lang={lang} navigate={navigate} />
  else if (path === "/contact")
    page = <ContactPage lang={lang} navigate={navigate} />
  else page = <Home lang={lang} navigate={navigate} />

  return (
    <LanguageContext.Provider value={lang}>
    <div ref={top} className="app-shell">
      <a className="skip-link" href="#main-content">
        {lang === "en" ? "Skip to content" : "انتقل إلى المحتوى"}
      </a>
      <Header
        lang={lang}
        setLang={setLang}
        navigate={navigate}
        path={path}
      />
      <div className="route-announcer" aria-live="polite">
        {path === "/" ? "Home" : path.split("/").filter(Boolean).join(" / ")}
      </div>
      <div id="main-content" tabIndex={-1}>
        {page}
      </div>
      <button
        type="button"
        className={`back-to-top ${showTop ? "visible" : ""}`}
        aria-label={lang === "en" ? "Back to top" : "العودة إلى الأعلى"}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <Arrow reverse />
      </button>
    </div>
    </LanguageContext.Provider>
  )
}

export default App
