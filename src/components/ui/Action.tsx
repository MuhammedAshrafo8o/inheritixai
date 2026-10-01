import Link from "next/link"
import React, { ReactNode } from "react"
import { Arrow } from "./Icons"

export function Action({
  to,
  children,
  light = false,
  className = "",
}: {
  to: string
  children: ReactNode
  light?: boolean
  className?: string
}) {
  return (
    <Link
      href={to}
      className={`action ${light ? "action-light" : ""} ${className}`.trim()}
    >
      <span>{children}</span>
      <Arrow />
    </Link>
  )
}
