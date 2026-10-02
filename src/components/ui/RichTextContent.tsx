import React from "react"
import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

/**
 * Renders Lexical rich text with Payload's official renderer. Plain strings
 * (legacy/development values) are rendered as a paragraph rather than dropped.
 */
export function RichTextContent({ value, className }: { value: unknown; className?: string }) {
  if (!value) return null
  if (typeof value === "string") return <p className={className}>{value}</p>
  if (typeof value === "object" && value !== null && "root" in value) {
    return <RichText data={value as SerializedEditorState} className={className} disableContainer={!className} />
  }
  return null
}
