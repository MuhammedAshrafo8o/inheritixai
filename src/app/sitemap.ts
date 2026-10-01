import type { MetadataRoute } from "next"
import {
  getPublishedPosts,
  getPublishedProducts,
  getPublishedProjects,
  getPublishedServices,
} from "@/cms/queries"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://inheritixai.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, products, projectsResult, posts] = await Promise.all([
    getPublishedServices("en"),
    getPublishedProducts("en"),
    getPublishedProjects("en", { limit: 100 }),
    getPublishedPosts("en", 100),
  ])

  const staticRoutes = [
    "",
    "/services",
    "/products",
    "/projects",
    "/about",
    "/insights",
    "/contact",
  ]

  const entries: MetadataRoute.Sitemap = []

  // Static routes
  for (const route of staticRoutes) {
    entries.push({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1.0 : 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}${route}`,
          ar: `${BASE_URL}/ar${route}`,
          "x-default": `${BASE_URL}${route}`,
        },
      },
    })
    entries.push({
      url: `${BASE_URL}/ar${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1.0 : 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}${route}`,
          ar: `${BASE_URL}/ar${route}`,
          "x-default": `${BASE_URL}${route}`,
        },
      },
    })
  }

  // Published Services
  for (const service of services) {
    const slug = (service as { slug: string }).slug
    entries.push({
      url: `${BASE_URL}/services/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/services/${slug}`,
          ar: `${BASE_URL}/ar/services/${slug}`,
          "x-default": `${BASE_URL}/services/${slug}`,
        },
      },
    })
  }

  // Published Products
  for (const product of products) {
    const slug = (product as { slug: string }).slug
    entries.push({
      url: `${BASE_URL}/products/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/products/${slug}`,
          ar: `${BASE_URL}/ar/products/${slug}`,
          "x-default": `${BASE_URL}/products/${slug}`,
        },
      },
    })
  }

  // Published Projects
  for (const project of projectsResult.docs) {
    const slug = (project as { slug: string }).slug
    entries.push({
      url: `${BASE_URL}/projects/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/projects/${slug}`,
          ar: `${BASE_URL}/ar/projects/${slug}`,
          "x-default": `${BASE_URL}/projects/${slug}`,
        },
      },
    })
  }

  // Published Posts
  for (const post of posts) {
    const slug = (post as { slug: string }).slug
    entries.push({
      url: `${BASE_URL}/insights/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: {
          en: `${BASE_URL}/insights/${slug}`,
          ar: `${BASE_URL}/ar/insights/${slug}`,
          "x-default": `${BASE_URL}/insights/${slug}`,
        },
      },
    })
  }

  return entries
}
