/**
 * Minimal builders for Lexical editor state, used by the seed script to store
 * real rich-text documents (the same JSON the admin editor produces).
 */

type TextFormat = { bold?: boolean; italic?: boolean }

function textNode(text: string, format: TextFormat = {}) {
  return {
    type: "text",
    text,
    detail: 0,
    format: (format.bold ? 1 : 0) | (format.italic ? 2 : 0),
    mode: "normal",
    style: "",
    version: 1,
  }
}

function blockNode(type: "paragraph" | "quote", children: unknown[], direction: "ltr" | "rtl") {
  return {
    type,
    children,
    direction,
    format: "",
    indent: 0,
    version: 1,
    ...(type === "paragraph" ? { textFormat: 0, textStyle: "" } : {}),
  }
}

function headingNode(tag: "h3", text: string, direction: "ltr" | "rtl") {
  return { type: "heading", tag, children: [textNode(text)], direction, format: "", indent: 0, version: 1 }
}

function listNode(items: string[], direction: "ltr" | "rtl") {
  return {
    type: "list",
    listType: "bullet",
    tag: "ul",
    start: 1,
    children: items.map((item, index) => ({
      type: "listitem",
      value: index + 1,
      children: [textNode(item)],
      direction,
      format: "",
      indent: 0,
      version: 1,
    })),
    direction,
    format: "",
    indent: 0,
    version: 1,
  }
}

export type RichTextPart =
  | string
  | { heading: string }
  | { list: string[] }
  | { quote: string }
  | { strong: string; rest?: string }

/** Builds a Lexical root from paragraphs, h3 headings, bullet lists, quotes and bold lead-ins. */
export function lexicalDocument(parts: RichTextPart[], direction: "ltr" | "rtl" = "ltr") {
  return {
    root: {
      type: "root",
      direction,
      format: "",
      indent: 0,
      version: 1,
      children: parts.map((part) => {
        if (typeof part === "string") return blockNode("paragraph", [textNode(part)], direction)
        if ("heading" in part) return headingNode("h3", part.heading, direction)
        if ("list" in part) return listNode(part.list, direction)
        if ("quote" in part) return blockNode("quote", [textNode(part.quote)], direction)
        return blockNode(
          "paragraph",
          [textNode(part.strong, { bold: true }), ...(part.rest ? [textNode(part.rest)] : [])],
          direction,
        )
      }),
    },
  }
}
