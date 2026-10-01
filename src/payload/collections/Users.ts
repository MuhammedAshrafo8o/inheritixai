import type { CollectionConfig } from "payload"
import { isAdmin, isAdminFieldLevel, usersAccess } from "../../cms/access"

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "roles"],
  },
  access: usersAccess,
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
  ],
}
