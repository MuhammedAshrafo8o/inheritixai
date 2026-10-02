import type { CollectionConfig, TextFieldSingleValidation } from "payload"
import { canDeleteContent, canManageContent } from "../../cms/access"
import { isInternalPath, normalizePath, wouldCreateRedirectLoop } from "../../cms/redirects"
import { revalidateAllAfterChange, revalidateAllAfterDelete } from "../hooks/revalidate"

export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    useAsTitle: "from",
    defaultColumns: ["from", "to", "statusCode", "source", "updatedAt"],
  },
  access: {
    read: () => true,
    create: canManageContent,
    update: canManageContent,
    delete: canDeleteContent,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.from && typeof data.from === "string") data.from = normalizePath(data.from)
        if (data?.to && typeof data.to === "string" && isInternalPath(data.to.trim())) {
          data.to = normalizePath(data.to)
        }
        return data
      },
    ],
    afterChange: [revalidateAllAfterChange],
    afterDelete: [revalidateAllAfterDelete],
  },
  fields: [
    {
      name: "from",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Old public path, e.g. /projects/old-slug",
      },
      validate: (val: string | null | undefined) => {
        if (!val) return "Source path is required"
        if (!isInternalPath(val)) return "Source path must start with a single slash (/)"
        if (/^\/(admin|api|_next)(\/|$)/.test(val)) return "Admin, API and framework paths cannot be redirected"
        return true
      },
    },
    {
      name: "to",
      type: "text",
      required: true,
      admin: {
        description: "Destination path (/new-path) or absolute https:// URL.",
      },
      validate: (async (val, { data, req, id }) => {
        if (!val) return "Destination path is required"
        const external = /^https?:\/\//i.test(val)
        if (!external && !isInternalPath(val)) {
          return "Destination must be a path starting with / or an http(s) URL"
        }
        const from =
          typeof (data as { from?: unknown })?.from === "string"
            ? normalizePath((data as { from: string }).from)
            : undefined
        if (!from || external) return true
        if (normalizePath(val) === from) {
          return "Destination cannot be identical to source path (redirect loop prevention)"
        }
        if (await wouldCreateRedirectLoop(req, from, val, id)) {
          return "This destination leads back to the source through other redirects (redirect loop prevention)"
        }
        return true
      }) as TextFieldSingleValidation,
    },
    {
      name: "statusCode",
      type: "select",
      defaultValue: "308",
      required: true,
      // Public routes redirect from React Server Components, which can emit
      // 308 (permanentRedirect) or 307 (redirect) — so only those are offered.
      options: [
        { label: "308 Permanent Redirect", value: "308" },
        { label: "307 Temporary Redirect", value: "307" },
      ],
      admin: { description: "308 for moved content (search engines transfer ranking), 307 for temporary moves." },
    },
    {
      name: "source",
      type: "select",
      defaultValue: "manual",
      options: [
        { label: "Manual", value: "manual" },
        { label: "Automatic (published slug change)", value: "slug-change" },
      ],
      admin: {
        readOnly: true,
        position: "sidebar",
      },
    },
  ],
}
