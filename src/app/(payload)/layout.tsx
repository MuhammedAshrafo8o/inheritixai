import config from "@/payload.config"
import "@payloadcms/next/css"
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts"
import React from "react"
import { importMap } from "./admin/importMap"

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={async function (args) {
      "use server"
      return handleServerFunctions({
        ...args,
        config,
        importMap,
      })
    }}
  >
    {children}
  </RootLayout>
)

export default Layout
