import path from "path"
import { fileURLToPath } from "url"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { buildConfig } from "payload"

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

import { SiteSettings } from "./payload/globals/SiteSettings"
import { Navigation } from "./payload/globals/Navigation"
import { HomePage } from "./payload/globals/HomePage"
import { AboutPage } from "./payload/globals/AboutPage"
import { ContactPage } from "./payload/globals/ContactPage"
import { ListingPages } from "./payload/globals/ListingPages"
import { SiteLabels } from "./payload/globals/SiteLabels"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
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
  ],
  globals: [
    SiteSettings,
    Navigation,
    HomePage,
    AboutPage,
    ContactPage,
    ListingPages,
    SiteLabels,
  ],
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    "inheritix-default-payload-secret-development-only-replace-in-production",
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
      connectionString:
        process.env.DATABASE_URI ||
        "postgresql://postgres:postgres@127.0.0.1:5432/inheritix",
    },
    migrationDir: path.resolve(dirname, "migrations"),
  }),
})
