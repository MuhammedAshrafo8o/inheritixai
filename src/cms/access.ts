import type { Access, FieldAccess } from "payload"

export type UserRole = "admin" | "editor"

export interface AuthenticatedCmsUser {
  id: string | number
  email: string
  roles: UserRole[]
}

export const isAdmin: Access = ({ req: { user } }) => {
  return Boolean(user && (user as unknown as AuthenticatedCmsUser).roles?.includes("admin"))
}

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => {
  return Boolean(user && (user as unknown as AuthenticatedCmsUser).roles?.includes("admin"))
}

export const canManageContent: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as unknown as AuthenticatedCmsUser).roles || []
  return roles.includes("admin") || roles.includes("editor")
}

export const canDeleteContent: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = (user as unknown as AuthenticatedCmsUser).roles || []
  return roles.includes("admin")
}

/**
 * Public read access: authenticated users can view drafts;
 * anonymous users can only view published documents.
 */
export const publicOrAuthenticatedRead: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    _status: {
      equals: "published",
    },
  }
}

/**
 * Access for Users collection:
 * Only admins can create, view all, update roles, or delete users.
 * Users can update their own profile.
 */
export const usersAccess: {
  read: Access
  create: Access
  update: Access
  delete: Access
} = {
  read: ({ req: { user } }) => {
    if (!user) return false
    if ((user as unknown as AuthenticatedCmsUser).roles?.includes("admin")) return true
    return {
      id: {
        equals: user.id,
      },
    }
  },
  create: isAdmin,
  update: ({ req: { user } }) => {
    if (!user) return false
    if ((user as unknown as AuthenticatedCmsUser).roles?.includes("admin")) return true
    return {
      id: {
        equals: user.id,
      },
    }
  },
  delete: isAdmin,
}

export const PUBLISHED_ONLY_WHERE = {
  _status: { equals: "published" },
} as const

export function isPubliclyReadable(status: string) {
  return status === "published"
}

export function projectPublicWhere(extra?: Record<string, unknown>) {
  return extra
    ? { and: [PUBLISHED_ONLY_WHERE, extra] }
    : PUBLISHED_ONLY_WHERE
}
