import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { Arrow } from "../ui/Icons"
import { SectionHead } from "../ui/SectionHead"
import { ProductStage } from "../mockups/ProductStage"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"
import type { PageHome, Post, Product, Project, Service, SiteLabel } from "@/payload-types"
import { localizedHref, mediaOf } from "@/site/metadata"

type SectionKey = NonNullable<PageHome["sectionOrder"]>[number]["section"]

const DEFAULT_ORDER: SectionKey[] = [
  "showcase",
  "selectedWork",
  "capabilities",
  "products",
  "approach",
  "perspective",
  "insights",
]

/** Editor-defined order, with any sections missing from the list appended in default order. */
export function resolveSectionOrder(home: PageHome): SectionKey[] {
  const chosen = (home.sectionOrder ?? []).map((row) => row.section).filter(Boolean)
  const unique = [...new Set(chosen)]
  return [...unique, ...DEFAULT_ORDER.filter((key) => !unique.includes(key))]
}

interface HomePageViewProps {
  lang: Locale
  home: PageHome
  services: Service[]
  products: Product[]
  posts: Post[]
  labels: SiteLabel
  featuredProject?: Project | null
}

function productOf(value: unknown, products: Product[]): Product | null {
  if (value && typeof value === "object" && "slug" in value) {
    const selected = value as Product
    // Respect publication: only render selections that are publicly listed.
    return products.find((p) => p.id === selected.id) ?? null
  }
  if (typeof value === "number") return products.find((p) => p.id === value) ?? null
  return null
}

function ProductVisual({ product }: { product: Product }) {
  return product.visualType === "phone" ? <MenuPhone /> : <Dashboard />
}

export function HomePageView({ lang, home, services, products, posts, labels, featuredProject }: HomePageViewProps) {
  const href = (path: string | null | undefined, fallback = "/") => localizedHref(path, lang, fallback)

  const sections: Record<SectionKey, () => React.ReactNode> = {
    showcase: () => {
      const s = home.showcaseSection
      if (s?.visible === false) return null
      return (
        <section className="showcase reveal" key="showcase">
          <ProductStage stageLabel={s?.stageLabel || undefined} stageNote={s?.stageNote || undefined} />
        </section>
      )
    },

    selectedWork: () => {
      const s = home.selectedWorkSection
      if (s?.visible === false) return null
      const featured = productOf(s?.featuredProduct, products)
      const secondary = productOf(s?.secondaryProduct, products)
      const story = s?.storyCard
      const storyProject = story?.source === "featuredProject" ? featuredProject : null
      const storyImage = mediaOf(storyProject?.cardImage)
      const ctaLabel = s?.productCtaLabel
      return (
        <section id="selected-work" className="work-section page-pad" key="selectedWork">
          <SectionHead label={s?.label || ""} title={s?.title || undefined} />

          {featured && (
            <article className="work-feature reveal">
              <div className="work-copy">
                <span className="eyebrow">{s?.featuredEyebrow}</span>
                <h3>{featured.name}</h3>
                <p>{featured.summary}</p>
                {ctaLabel && <Action to={href(`/products/${featured.slug}`)}>{ctaLabel}</Action>}
              </div>
              <div className={`work-visual ${featured.visualType === "phone" ? "menu-visual" : "logisttex"}`}>
                <ProductVisual product={featured} />
              </div>
            </article>
          )}

          {(secondary || story?.visible !== false) && (
            <div className="work-pair">
              {secondary && (
                <article className="mini-project reveal">
                  <div className={`mini-visual ${secondary.visualType === "phone" ? "menu-visual" : "logisttex"}`}>
                    <ProductVisual product={secondary} />
                  </div>
                  <span className="eyebrow">{s?.secondaryEyebrow}</span>
                  <h3>{secondary.name}</h3>
                  <p>{secondary.summary}</p>
                  {ctaLabel && <Action to={href(`/products/${secondary.slug}`)}>{ctaLabel}</Action>}
                </article>
              )}

              {story?.visible !== false && storyProject && (
                <article className="mini-project reveal shift">
                  <div className="mini-visual system-visual">
                    {storyImage?.url ? (
                      <img
                        src={storyImage.url}
                        alt={storyImage.alt || storyProject.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div className="system-ring" />
                    )}
                  </div>
                  <span className="eyebrow">{[storyProject.sector, storyProject.year].filter(Boolean).join(" · ")}</span>
                  <h3>{storyProject.title}</h3>
                  <p>{storyProject.summary}</p>
                  {labels.readStory && (
                    <Action to={href(`/projects/${storyProject.slug}`)}>{labels.readStory}</Action>
                  )}
                </article>
              )}

              {story?.visible !== false && story && !storyProject && (
                <article className="mini-project reveal shift">
                  <div className="mini-visual system-visual">
                    <div className="system-type">{story.visualIndex}</div>
                    <div className="system-ring" />
                    <p>{story.visualText}</p>
                  </div>
                  <span className="eyebrow">{story.eyebrow}</span>
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                  {story.cta?.href && story.cta.label && <Action to={href(story.cta.href)}>{story.cta.label}</Action>}
                </article>
              )}
            </div>
          )}
        </section>
      )
    },

    capabilities: () => {
      const s = home.capabilitiesSection
      if (s?.visible === false) return null
      return (
        <section className="capabilities page-pad" key="capabilities">
          <SectionHead label={s?.label || ""} title={s?.title || undefined} />
          <div className="service-list">
            {services.map((service) => (
              <Link key={service.id} href={href(`/services/${service.slug}`)} className="service-row reveal">
                <span>{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.shortDescription}</p>
                <i>
                  <Arrow />
                </i>
              </Link>
            ))}
          </div>
        </section>
      )
    },

    products: () => {
      const s = home.productsDarkSection
      if (s?.visible === false) return null
      return (
        <section className="products-dark" key="products">
          <div className="page-pad">
            <SectionHead label={s?.label || ""} title={s?.title || undefined} />
            {products.map((product, index) => {
              const isPhone = product.visualType === "phone"
              return (
                <div className={index % 2 === 1 ? "product-split reverse" : "product-split"} key={product.id}>
                  <div className="product-copy reveal">
                    <span>
                      {String(index + 1).padStart(2, "0")} / {product.name.toUpperCase()}
                    </span>
                    <h3>{product.tagline}</h3>
                    <p>{product.homeDescription || product.summary}</p>
                    <Action to={href(`/products/${product.slug}`)} light>
                      {`${s?.ctaPrefix ?? ""} ${product.name}`.trim()}
                    </Action>
                  </div>
                  {isPhone ? (
                    <div className="menu-cluster reveal">
                      <MenuPhone />
                      <MenuPhone />
                    </div>
                  ) : (
                    <div className="dark-dashboard reveal">
                      <Dashboard />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )
    },

    approach: () => {
      const s = home.approachSection
      if (s?.visible === false) return null
      return (
        <section className="approach page-pad" key="approach">
          <SectionHead label={s?.label || ""} title={s?.title || undefined} />
          <div className="approach-grid">
            {(s?.phases ?? []).map((phase) => (
              <div className="approach-item reveal" key={phase.id ?? phase.number}>
                <span>{phase.number}</span>
                <h3>{phase.name}</h3>
                <p>{phase.description}</p>
              </div>
            ))}
          </div>
        </section>
      )
    },

    perspective: () => {
      const s = home.perspectiveSection
      if (s?.visible === false) return null
      const image = mediaOf(s?.image)
      const src = image?.url || s?.imageUrl
      return (
        <section className="perspective" key="perspective">
          {src && (
            <div className="perspective-image">
              <img src={src} alt={image?.alt || s?.imageAlt || ""} />
            </div>
          )}
          <div className="perspective-copy reveal">
            <span className="eyebrow">{s?.eyebrow}</span>
            <h2>{s?.title}</h2>
            <p>{s?.description}</p>
            {s?.cta?.href && <Action to={href(s.cta.href)}>{s.cta.label}</Action>}
          </div>
        </section>
      )
    },

    insights: () => {
      const s = home.insightsSection
      if (s?.visible === false || posts.length === 0) return null
      return (
        <section className="insights page-pad" key="insights">
          <SectionHead label={s?.label || ""} title={s?.title || undefined} />
          <div className="article-grid">
            {posts.slice(0, 3).map((article, index) => (
              <Link key={article.id} href={href(`/insights/${article.slug}`)} className="article-card reveal">
                <div className={`article-art ${article.color || "ink"}`}>
                  <span>0{index + 1}</span>
                  <i />
                </div>
                <span className="eyebrow">{article.categoryLabel}</span>
                <h3>{article.title}</h3>
                <div className="article-meta">
                  <span>{article.readTime}</span>
                  <Arrow />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )
    },
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-index">{home.heroIndex}</div>
        <h1>
          <span>{home.heroTitleA}</span>
          <span className="accent-line">{home.heroTitleB}</span>
        </h1>
        <div className="hero-meta">
          <p>{home.heroCopy}</p>
          <div className="hero-links">
            {home.heroPrimaryCta?.href && home.heroPrimaryCta.label && (
              <Action to={href(home.heroPrimaryCta.href)}>{home.heroPrimaryCta.label}</Action>
            )}
            {home.heroSecondaryCta?.href && home.heroSecondaryCta.label && (
              <Action to={href(home.heroSecondaryCta.href)}>{home.heroSecondaryCta.label}</Action>
            )}
          </div>
        </div>
      </section>

      {resolveSectionOrder(home).map((key) => (
        <React.Fragment key={key}>{sections[key]?.()}</React.Fragment>
      ))}
    </main>
  )
}
