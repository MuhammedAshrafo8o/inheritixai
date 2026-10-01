export type Locale = "en" | "ar"

export type LocalizedText = Record<Locale, string>

export type EditableLink = {
  label: LocalizedText
  href: Record<Locale, string>
  newTab?: boolean
}

export type EditableImage = {
  id: string
  src: string
  alt: LocalizedText
  description: LocalizedText
  width: number
  height: number
  focalPoint?: { x: number; y: number }
}

export type ClientLogo = EditableImage & {
  /** Original brand colors are the publishing default. */
  displayMode?: "original" | "monochrome"
}

export type SeoFields = {
  title: LocalizedText
  description: LocalizedText
  image?: EditableImage
  noIndex?: boolean
}

type BlockBase = {
  id: string
}

export type IntroBlock = BlockBase & {
  blockType: "intro"
  eyebrow?: LocalizedText
  heading: LocalizedText
  body: LocalizedText
}

export type RichTextBlock = BlockBase & {
  blockType: "richText"
  heading?: LocalizedText
  body: LocalizedText
}

export type ImageBlock = BlockBase & {
  blockType: "image"
  image: EditableImage
  caption?: LocalizedText
}

export type MetricsBlock = BlockBase & {
  blockType: "metrics"
  items: Array<{
    id: string
    value: LocalizedText
    label: LocalizedText
  }>
}

export type QuoteBlock = BlockBase & {
  blockType: "quote"
  quote: LocalizedText
  attribution?: LocalizedText
}

export type CtaBlock = BlockBase & {
  blockType: "cta"
  heading: LocalizedText
  body?: LocalizedText
  action: EditableLink
}

/** Payload will expose this array as an admin-reorderable Blocks field. */
export type ProjectContentBlock =
  | IntroBlock
  | RichTextBlock
  | ImageBlock
  | MetricsBlock
  | QuoteBlock
  | CtaBlock

export type PublicationState = "draft" | "published" | "development-fixture"

export interface Project {
  id: string
  slug: string
  previousSlugs: string[]
  status: PublicationState
  featured: boolean
  title: LocalizedText
  summary: LocalizedText
  sector: LocalizedText
  services: LocalizedText[]
  year: string
  cardImage: EditableImage
  heroImage: EditableImage
  clientLogo?: ClientLogo
  primaryCta?: EditableLink
  blocks: ProjectContentBlock[]
  relatedProjectIds: string[]
  seo: SeoFields
}

export interface SiteNavigationItem {
  id: string
  label: LocalizedText
  destination: Record<Locale, string>
}

export interface SiteSettings {
  siteName: string
  navigation: SiteNavigationItem[]
  headerCta: EditableLink
  footerHeading: LocalizedText
  footerCta: EditableLink
  socialLinks: EditableLink[]
  defaultSeo: SeoFields
}

export interface EditorialPage {
  id: string
  slug: string
  status: Exclude<PublicationState, "development-fixture">
  heroEyebrow?: LocalizedText
  heroHeading: LocalizedText
  heroBody?: LocalizedText
  heroImage?: EditableImage
  primaryCta?: EditableLink
  sections: ProjectContentBlock[]
  seo: SeoFields
}
