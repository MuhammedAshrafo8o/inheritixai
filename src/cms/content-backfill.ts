import type { Payload, PayloadRequest } from "payload"
import {
  ARTICLE_CTA_COPY,
  CONTACT_FORM_COPY,
  LISTING_COPY,
  PRODUCT_SECTION_COPY,
  SERVICE_SECTION_COPY,
  SITE_LABEL_COPY,
  arabicOf,
} from "../content/starter-copy"

type Args = { payload: Payload; req: PayloadRequest }
const context = { disableRevalidate: true }
const isEmpty = (value: unknown) => value === null || value === undefined || (typeof value === "string" && !value.trim())

/**
 * Data step of the `content_controls` migration.
 *
 * Before this migration the website filled empty fields with copy hardcoded
 * in components. Now empty means "hidden", so existing records get that copy
 * stored explicitly — rendered output is unchanged, and from here on a null
 * field is an editor's intentional choice. Only empty values are written;
 * nothing an editor entered is overwritten. New label columns receive their
 * English text through column defaults, so Arabic rows are set here.
 */
export async function backfillContentControls({ payload, req }: Args) {
  const globalExists = async (slug: "site-labels" | "page-contact" | "listing-pages") =>
    Boolean(((await payload.db.findGlobal({ slug, req })) as { id?: unknown })?.id)

  if (await globalExists("site-labels")) {
    await payload.updateGlobal({
      slug: "site-labels",
      locale: "ar",
      data: {
        ...arabicOf(SITE_LABEL_COPY),
        articleCta: { visible: true, href: "/contact", ...arabicOf(ARTICLE_CTA_COPY) },
      } as never,
      req,
      context,
    })
  }

  if (await globalExists("page-contact")) {
    await payload.updateGlobal({
      slug: "page-contact",
      locale: "ar",
      data: { form: arabicOf(CONTACT_FORM_COPY) } as never,
      req,
      context,
    })
  }

  if (await globalExists("listing-pages")) {
    const ar = (await payload.findGlobal({ slug: "listing-pages", locale: "ar", fallbackLocale: false, depth: 0, req })) as unknown as Record<
      string,
      Record<string, unknown>
    >
    await payload.updateGlobal({
      slug: "listing-pages",
      locale: "ar",
      data: {
        services: { ...ar.services, cardNote: LISTING_COPY.servicesCardNote.ar },
        insights: {
          ...ar.insights,
          sectionLabel: LISTING_COPY.insightsSectionLabel.ar,
          sectionTitle: LISTING_COPY.insightsSectionTitle.ar,
        },
      } as never,
      req,
      context,
    })
  }

  for (const locale of ["en", "ar"] as const) {
    const services = await payload.find({
      collection: "services",
      locale,
      fallbackLocale: false,
      pagination: false,
      depth: 0,
      req,
    })
    for (const doc of services.docs as unknown as Array<Record<string, unknown> & { id: number }>) {
      const data: Record<string, string> = {}
      for (const [field, copy] of Object.entries(SERVICE_SECTION_COPY)) {
        if (isEmpty(doc[field])) data[field] = copy[locale]
      }
      if (Object.keys(data).length) {
        await payload.update({ collection: "services", id: doc.id, locale, data, req, context })
      }
    }

    const products = await payload.find({
      collection: "products",
      locale,
      fallbackLocale: false,
      pagination: false,
      depth: 0,
      req,
    })
    for (const doc of products.docs as unknown as Array<Record<string, unknown> & { id: number }>) {
      const copy = PRODUCT_SECTION_COPY[doc.visualType === "phone" ? "phone" : "dashboard"]
      const data: Record<string, string> = {}
      for (const [field, value] of Object.entries(copy)) {
        if (isEmpty(doc[field])) data[field] = value[locale]
      }
      if (Object.keys(data).length) {
        await payload.update({ collection: "products", id: doc.id, locale, data, req, context })
      }
    }
  }
}
