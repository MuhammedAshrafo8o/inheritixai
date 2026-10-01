import type { Block } from "payload"

export const IntroBlock: Block = {
  slug: "intro",
  labels: {
    singular: "Intro Block",
    plural: "Intro Blocks",
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      localized: true,
    },
    {
      name: "heading",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "body",
      type: "textarea",
      localized: true,
      required: true,
    },
  ],
}

export const RichTextBlock: Block = {
  slug: "richText",
  labels: {
    singular: "Rich Text Block",
    plural: "Rich Text Blocks",
  },
  fields: [
    {
      name: "heading",
      type: "text",
      localized: true,
    },
    {
      name: "body",
      type: "richText",
      localized: true,
      required: true,
    },
  ],
}

export const ImageBlock: Block = {
  slug: "image",
  labels: {
    singular: "Image Block",
    plural: "Image Blocks",
  },
  fields: [
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "caption",
      type: "text",
      localized: true,
    },
  ],
}

export const MetricsBlock: Block = {
  slug: "metrics",
  labels: {
    singular: "Metrics Block",
    plural: "Metrics Blocks",
  },
  fields: [
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      maxRows: 6,
      fields: [
        {
          name: "value",
          type: "text",
          localized: true,
          required: true,
        },
        {
          name: "label",
          type: "text",
          localized: true,
          required: true,
        },
      ],
    },
  ],
}

export const QuoteBlock: Block = {
  slug: "quote",
  labels: {
    singular: "Quote Block",
    plural: "Quote Blocks",
  },
  fields: [
    {
      name: "quote",
      type: "textarea",
      localized: true,
      required: true,
    },
    {
      name: "attribution",
      type: "text",
      localized: true,
    },
  ],
}

export const CtaBlock: Block = {
  slug: "cta",
  labels: {
    singular: "Call to Action Block",
    plural: "Call to Action Blocks",
  },
  fields: [
    {
      name: "heading",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "body",
      type: "textarea",
      localized: true,
    },
    {
      name: "actionLabel",
      type: "text",
      localized: true,
      required: true,
    },
    {
      name: "actionHref",
      type: "text",
      localized: true,
      required: true,
    },
  ],
}

export const allContentBlocks: Block[] = [
  IntroBlock,
  RichTextBlock,
  ImageBlock,
  MetricsBlock,
  QuoteBlock,
  CtaBlock,
]
