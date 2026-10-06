"use client"

import { useState } from "react"
import { useDocumentInfo } from "@payloadcms/ui"

export function InquiryActions() {
  const { id, data } = useDocumentInfo()
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState(false)
  const email = typeof data?.email === "string" ? data.email : ""

  async function retry() {
    if (!id || busy) return
    setBusy(true)
    setResult("")
    try {
      const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(String(id))}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const body = (await response.json()) as { ok?: boolean; message?: string }
      setResult(body.message || (response.ok ? "Notification queued." : "Retry was not queued."))
    } catch {
      setResult("The retry request could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBlock: 18 }}>
      {email && <a className="btn btn--style-secondary btn--size-medium" href={`mailto:${encodeURIComponent(email)}`}>Contact visitor</a>}
      <button className="btn btn--style-primary btn--size-medium" type="button" onClick={retry} disabled={!id || busy}>
        {busy ? "Queueing…" : "Retry failed notification"}
      </button>
      {result && <span role="status">{result}</span>}
    </div>
  )
}
