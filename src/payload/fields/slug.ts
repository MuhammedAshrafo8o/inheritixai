import type { TextField } from "payload"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** URL slug: lowercase kebab-case, unique per collection. */
export function slugField(description = "URL segment, lowercase-with-hyphens."): TextField {
  return {
    name: "slug",
    type: "text",
    required: true,
    unique: true,
    index: true,
    admin: {
      position: "sidebar",
      description: `${description} Changing the slug of a published record creates a permanent redirect when the change is published.`,
    },
    validate: (val: string | null | undefined) => {
      if (!val) return "Slug is required"
      return SLUG_PATTERN.test(val) ? true : "Use lowercase letters, digits and single hyphens (e.g. my-project)."
    },
  }
}
