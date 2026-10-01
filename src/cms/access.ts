import type { PublicationState } from "@/content/types"

export type AuthenticatedCmsUser = {
  id: string
  roles: Array<"admin" | "editor">
}

export type AccessContext = {
  user: AuthenticatedCmsUser | null
}

export const isAuthenticated = ({ user }: AccessContext) => Boolean(user)

export const canManageContent = ({ user }: AccessContext) =>
  Boolean(user?.roles.some((role) => role === "admin" || role === "editor"))

export const canDeleteContent = ({ user }: AccessContext) =>
  Boolean(user?.roles.includes("admin"))

export const publicReadAccess = ({ user }: AccessContext) => {
  if (user) return true
  return { _status: { equals: "published" } } as const
}

export const PUBLISHED_ONLY_WHERE = {
  _status: { equals: "published" },
} as const

export function isPubliclyReadable(status: PublicationState) {
  return status === "published"
}

/**
 * The Payload adapter must apply this predicate to every anonymous project
 * lookup, including listing, featured, related, and slug queries.
 */
export function projectPublicWhere(extra?: Record<string, unknown>) {
  return extra
    ? { and: [PUBLISHED_ONLY_WHERE, extra] }
    : PUBLISHED_ONLY_WHERE
}
