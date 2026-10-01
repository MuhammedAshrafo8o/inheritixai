import { withPayload } from "@payloadcms/next/withPayload"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/work",
        destination: "/projects",
        permanent: true,
      },
      {
        source: "/ar/work",
        destination: "/ar/projects",
        permanent: true,
      },
      {
        source: "/work/:slug",
        destination: "/projects/:slug",
        permanent: true,
      },
      {
        source: "/ar/work/:slug",
        destination: "/ar/projects/:slug",
        permanent: true,
      },
    ]
  },
}

export default withPayload(nextConfig)
