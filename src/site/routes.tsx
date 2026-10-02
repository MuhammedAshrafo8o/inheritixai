import type { Metadata } from "next"
import { notFound, permanentRedirect, redirect } from "next/navigation"
import type { Locale } from "@/content/types"
import {
  getAboutPage,
  getContactPage,
  getDevelopmentFixtureProject,
  getFeaturedProjects,
  getHomePage,
  getListingPages,
  getPostBySlug,
  getProductBySlug,
  getProjectBySlug,
  getPublishedPosts,
  getPublishedProducts,
  getPublishedProjects,
  getPublishedServices,
  getRedirectForPath,
  getServiceBySlug,
  getSiteLabels,
  getSiteSettings,
  getTranslatedLocales,
  getViewer,
  resolveRelatedProjects,
} from "@/cms/queries"
import { HomePageView } from "@/components/pages/HomePageView"
import { ServicesPageView } from "@/components/pages/ServicesPageView"
import { ServiceDetailPageView } from "@/components/pages/ServiceDetailPageView"
import { ProductsPageView } from "@/components/pages/ProductsPageView"
import { ProductDetailPageView } from "@/components/pages/ProductDetailPageView"
import { ProjectsPageView } from "@/components/pages/ProjectsPageView"
import { ProjectDetailPageView } from "@/components/pages/ProjectDetailPageView"
import { InsightsPageView } from "@/components/pages/InsightsPageView"
import { ArticlePageView } from "@/components/pages/ArticlePageView"
import { AboutPageView } from "@/components/pages/AboutPageView"
import { ContactPageView } from "@/components/pages/ContactPageView"
import { buildMetadata, localizedHref } from "./metadata"

/** Metadata for a missing record; the title is the CMS 404 title (Site Labels). */
async function notFoundMetadata(locale: Locale): Promise<Metadata> {
  const labels = await getSiteLabels(locale)
  return { title: labels.notFoundTitle || undefined, robots: { index: false } }
}

/** Stored redirects are resolved before a public route returns 404. */
async function notFoundOrRedirect(path: string): Promise<never> {
  const target = await getRedirectForPath(path)
  if (target) {
    if (target.statusCode === 307) redirect(target.to)
    permanentRedirect(target.to)
  }
  notFound()
}

// ─── Home ───────────────────────────────────────────────────────────────────

export async function homeMetadata(locale: Locale): Promise<Metadata> {
  const [home, settings] = await Promise.all([getHomePage(locale), getSiteSettings(locale)])
  return buildMetadata({
    locale,
    path: "/",
    seo: home.seo,
    fallbackTitle: [home.heroTitleA, home.heroTitleB].filter(Boolean).join(" "),
    fallbackDescription: home.heroCopy,
    siteSettings: settings,
    absoluteTitle: true,
  })
}

export async function HomeRoute({ locale }: { locale: Locale }) {
  const [home, services, products, posts, labels, featured] = await Promise.all([
    getHomePage(locale),
    getPublishedServices(locale),
    getPublishedProducts(locale),
    getPublishedPosts(locale, 3),
    getSiteLabels(locale),
    getFeaturedProjects(locale, 1),
  ])
  return (
    <HomePageView
      lang={locale}
      home={home}
      services={services}
      products={products}
      posts={posts}
      labels={labels}
      featuredProject={featured[0] ?? null}
    />
  )
}

// ─── Listings ───────────────────────────────────────────────────────────────

type ListingKey = "services" | "products" | "projects" | "insights"

async function listingMetadata(locale: Locale, key: ListingKey): Promise<Metadata> {
  const [listing, settings] = await Promise.all([getListingPages(locale), getSiteSettings(locale)])
  const section = listing[key]
  return buildMetadata({
    locale,
    path: `/${key}`,
    seo: section?.seo,
    fallbackTitle: section?.title,
    fallbackDescription: section?.intro,
    siteSettings: settings,
  })
}

export const servicesMetadata = (locale: Locale) => listingMetadata(locale, "services")
export const productsMetadata = (locale: Locale) => listingMetadata(locale, "products")
export const projectsMetadata = (locale: Locale) => listingMetadata(locale, "projects")
export const insightsMetadata = (locale: Locale) => listingMetadata(locale, "insights")

export async function ServicesRoute({ locale }: { locale: Locale }) {
  const [listing, services, labels] = await Promise.all([
    getListingPages(locale),
    getPublishedServices(locale),
    getSiteLabels(locale),
  ])
  return <ServicesPageView lang={locale} services={services} listingHeader={listing.services} labels={labels} />
}

export async function ProductsRoute({ locale }: { locale: Locale }) {
  const [listing, products, labels] = await Promise.all([
    getListingPages(locale),
    getPublishedProducts(locale),
    getSiteLabels(locale),
  ])
  return <ProductsPageView lang={locale} products={products} listingHeader={listing.products} labels={labels} />
}

export async function ProjectsRoute({
  locale,
  searchParams,
}: {
  locale: Locale
  searchParams: Promise<{ sector?: string; page?: string }>
}) {
  const { sector = "all", page = "1" } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)
  const [listing, projects, labels] = await Promise.all([
    getListingPages(locale),
    getPublishedProjects(locale, { sector, page: currentPage, limit: 12 }),
    getSiteLabels(locale),
  ])
  return (
    <ProjectsPageView
      lang={locale}
      listing={projects}
      currentSector={sector}
      listingHeader={listing.projects}
      labels={labels}
    />
  )
}

export async function InsightsRoute({ locale }: { locale: Locale }) {
  const [listing, posts] = await Promise.all([getListingPages(locale), getPublishedPosts(locale, 50)])
  return <InsightsPageView lang={locale} posts={posts} listingHeader={listing.insights} />
}

// ─── Details ────────────────────────────────────────────────────────────────

export async function serviceMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const [service, settings] = await Promise.all([getServiceBySlug(slug, locale), getSiteSettings(locale)])
  if (!service) return notFoundMetadata(locale)
  return buildMetadata({
    locale,
    path: `/services/${slug}`,
    seo: service.seo,
    fallbackTitle: service.title,
    fallbackDescription: service.shortDescription,
    siteSettings: settings,
    availableLocales: await getTranslatedLocales("services", service.id),
  })
}

export async function ServiceRoute({ locale, slug }: { locale: Locale; slug: string }) {
  const [service, labels] = await Promise.all([getServiceBySlug(slug, locale), getSiteLabels(locale)])
  if (!service) return notFoundOrRedirect(localizedHref(`/services/${slug}`, locale))
  return <ServiceDetailPageView lang={locale} service={service} labels={labels} />
}

export async function productMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const [product, settings] = await Promise.all([getProductBySlug(slug, locale), getSiteSettings(locale)])
  if (!product) return notFoundMetadata(locale)
  return buildMetadata({
    locale,
    path: `/products/${slug}`,
    seo: product.seo,
    fallbackTitle: `${product.name} — ${product.tagline}`,
    fallbackDescription: product.summary,
    siteSettings: settings,
    availableLocales: await getTranslatedLocales("products", product.id),
  })
}

export async function ProductRoute({ locale, slug }: { locale: Locale; slug: string }) {
  const [product, labels] = await Promise.all([getProductBySlug(slug, locale), getSiteLabels(locale)])
  if (!product) return notFoundOrRedirect(localizedHref(`/products/${slug}`, locale))
  return <ProductDetailPageView lang={locale} product={product} labels={labels} />
}

export async function projectMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const [project, settings] = await Promise.all([getProjectBySlug(slug, locale), getSiteSettings(locale)])
  if (!project) {
    const fixture = await getDevelopmentFixtureProject(slug, locale)
    return fixture
      ? { title: fixture.title, robots: { index: false, follow: false } }
      : await notFoundMetadata(locale)
  }
  return buildMetadata({
    locale,
    path: `/projects/${slug}`,
    seo: project.seo,
    fallbackTitle: project.title,
    fallbackDescription: project.summary,
    siteSettings: settings,
    availableLocales: await getTranslatedLocales("projects", project.id),
    type: "article",
  })
}

export async function ProjectRoute({ locale, slug }: { locale: Locale; slug: string }) {
  const [project, labels, viewer] = await Promise.all([
    getProjectBySlug(slug, locale),
    getSiteLabels(locale),
    getViewer(),
  ])
  if (!project) {
    const fixture = await getDevelopmentFixtureProject(slug, locale)
    if (fixture) return <ProjectDetailPageView lang={locale} project={fixture} labels={labels} relatedProjects={[]} />
    return notFoundOrRedirect(localizedHref(`/projects/${slug}`, locale))
  }
  return (
    <ProjectDetailPageView
      lang={locale}
      project={project}
      labels={labels}
      relatedProjects={resolveRelatedProjects(project, viewer)}
      isDraftPreview={viewer.draft}
    />
  )
}

export async function postMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const [post, settings] = await Promise.all([getPostBySlug(slug, locale), getSiteSettings(locale)])
  if (!post) return notFoundMetadata(locale)
  const metadata = buildMetadata({
    locale,
    path: `/insights/${slug}`,
    seo: post.seo,
    fallbackTitle: post.title,
    fallbackDescription: post.excerpt,
    siteSettings: settings,
    availableLocales: await getTranslatedLocales("posts", post.id),
    type: "article",
  })
  const author = typeof post.author === "object" && post.author ? post.author.name : undefined
  return {
    ...metadata,
    authors: author ? [{ name: author }] : undefined,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: author ? [author] : undefined,
    },
  }
}

export async function PostRoute({ locale, slug }: { locale: Locale; slug: string }) {
  const [post, labels] = await Promise.all([getPostBySlug(slug, locale), getSiteLabels(locale)])
  if (!post) return notFoundOrRedirect(localizedHref(`/insights/${slug}`, locale))
  const more = (await getPublishedPosts(locale, 4)).filter((p) => p.slug !== slug).slice(0, 3)
  return <ArticlePageView lang={locale} post={post} morePosts={more} labels={labels} />
}

// ─── Single pages ───────────────────────────────────────────────────────────

export async function aboutMetadata(locale: Locale): Promise<Metadata> {
  const [about, settings] = await Promise.all([getAboutPage(locale), getSiteSettings(locale)])
  return buildMetadata({
    locale,
    path: "/about",
    seo: about.seo,
    fallbackTitle: about.title,
    fallbackDescription: about.intro,
    siteSettings: settings,
  })
}

export async function AboutRoute({ locale }: { locale: Locale }) {
  return <AboutPageView lang={locale} about={await getAboutPage(locale)} />
}

export async function contactMetadata(locale: Locale): Promise<Metadata> {
  const [contact, settings] = await Promise.all([getContactPage(locale), getSiteSettings(locale)])
  return buildMetadata({
    locale,
    path: "/contact",
    seo: contact.seo,
    fallbackTitle: contact.title,
    fallbackDescription: contact.intro,
    siteSettings: settings,
  })
}

export async function ContactRoute({ locale }: { locale: Locale }) {
  const [contact, products, services] = await Promise.all([
    getContactPage(locale),
    getPublishedProducts(locale),
    getPublishedServices(locale),
  ])
  return (
    <ContactPageView
      lang={locale}
      contact={contact}
      products={products.map((p) => p.name).filter(Boolean)}
      services={services.map((s) => s.title).filter(Boolean)}
    />
  )
}

/** Any other path: honour a stored redirect, otherwise 404. */
export async function CatchAllRoute({ locale, segments }: { locale: Locale; segments: string[] }) {
  const decoded = segments.map((segment) => {
    try {
      return decodeURIComponent(segment)
    } catch {
      return segment
    }
  })
  const path = `${locale === "ar" ? "/ar" : ""}/${decoded.join("/")}`
  return notFoundOrRedirect(path)
}
