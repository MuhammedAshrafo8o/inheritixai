import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://inheritixai.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api", "/api/*"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
