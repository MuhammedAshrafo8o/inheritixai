import type { Metadata } from "next"

export const siteMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://inheritix.com"),
  title: {
    default: "Inheritix — Beautifully designed. Seriously engineered.",
    template: "%s | Inheritix",
  },
  description:
    "Inheritix designs and engineers software for complex businesses and useful digital products.",
}
