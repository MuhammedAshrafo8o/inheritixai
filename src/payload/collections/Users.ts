import { APIError, ValidationError, type CollectionConfig } from "payload"
import { isAdminFieldLevel, usersAccess } from "../../cms/access"
import { passwordPolicyProblem } from "../../cms/credential-policy"

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "roles", "passwordRotationRequired"],
  },
  access: usersAccess,
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        const password = data?.password
        if (typeof password === "string" && password.length > 0) {
          const problem = passwordPolicyProblem(password, data?.email ?? originalDoc?.email)
          if (problem) {
            throw new ValidationError({
              collection: "users",
              errors: [{ message: problem, path: "password" }],
              req,
            })
          }
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        // Setting a new, policy-compliant password clears a forced rotation.
        if (typeof data?.password === "string" && data.password.length > 0) {
          data.passwordRotationRequired = false
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user?.passwordRotationRequired) {
          throw new APIError(
            "This account must set a new password before signing in. Ask an administrator, or run `npm run bootstrap:users`.",
            403,
            undefined,
            true,
          )
        }
        return user
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      defaultValue: ["editor"],
      required: true,
      saveToJWT: true,
      access: {
        update: isAdminFieldLevel,
        create: isAdminFieldLevel,
      },
      options: [
        {
          label: "Administrator",
          value: "admin",
        },
        {
          label: "Editor",
          value: "editor",
        },
      ],
    },
    {
      name: "passwordRotationRequired",
      type: "checkbox",
      defaultValue: false,
      access: {
        update: isAdminFieldLevel,
        create: isAdminFieldLevel,
      },
      admin: {
        position: "sidebar",
        description:
          "Set automatically when an account was found using a published default password. Cleared when a new password is saved.",
      },
    },
  ],
}
