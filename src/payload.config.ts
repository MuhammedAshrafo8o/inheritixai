import path from "path"
import { fileURLToPath } from "url"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { buildConfig } from "payload"
import sharp from "sharp"

import { getServerEnv } from "./env"
import { Users } from "./payload/collections/Users"
import { Media } from "./payload/collections/Media"
import { Clients } from "./payload/collections/Clients"
import { Projects } from "./payload/collections/Projects"
import { Products } from "./payload/collections/Products"
import { Services } from "./payload/collections/Services"
import { Posts } from "./payload/collections/Posts"
import { Categories } from "./payload/collections/Categories"
import { Authors } from "./payload/collections/Authors"
import { Redirects } from "./payload/collections/Redirects"
import { Inquiries } from "./payload/collections/Inquiries"
import { InquiryRateLimits } from "./payload/collections/InquiryRateLimits"
import { EmailSecrets } from "./payload/collections/EmailSecrets"

import { SiteSettings } from "./payload/globals/SiteSettings"
import { Navigation } from "./payload/globals/Navigation"
import { HomePage } from "./payload/globals/HomePage"
import { AboutPage } from "./payload/globals/AboutPage"
import { ContactPage } from "./payload/globals/ContactPage"
import { ListingPages } from "./payload/globals/ListingPages"
import { SiteLabels } from "./payload/globals/SiteLabels"
import { EmailSettings } from "./payload/globals/EmailSettings"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Throws a descriptive EnvironmentConfigError when secrets or the database
// connection string are missing — Payload never starts with defaults.
const env = getServerEnv()

export default buildConfig({
  serverURL: env.SITE_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, "app/(payload)/admin/importMap.ts"),
    },
    meta: {
      titleSuffix: " — Inheritix CMS",
    },
  },
  collections: [
    Users,
    Media,
    Clients,
    Projects,
    Products,
    Services,
    Posts,
    Categories,
    Authors,
    Redirects,
    Inquiries,
    InquiryRateLimits,
    EmailSecrets,
  ],
  globals: [
    SiteSettings,
    Navigation,
    HomePage,
    AboutPage,
    ContactPage,
    ListingPages,
    SiteLabels,
    EmailSettings,
  ],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  sharp,
  localization: {
    locales: [
      {
        label: "English",
        code: "en",
      },
      {
        label: "العربية (Arabic)",
        code: "ar",
        rtl: true,
      },
    ],
    defaultLocale: "en",
    fallback: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URI,
    },
    // Schema changes ship only through versioned migrations. Automatic dev
    // push is disabled so it can never mask a missing or broken migration.
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
})
