"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDocumentInfo } from "@payloadcms/ui"

export function InquiryActions() {
  const { id, data } = useDocumentInfo()
  const router = useRouter()
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState(false)
  const email = typeof data?.email === "string" ? data.email : ""
  const status = typeof data?.notificationStatus === "string" ? data.notificationStatus : ""
  const isUncertain = status === "uncertain"

  async function retry() {
    if (!id || busy) return
    if (isUncertain) {
      const confirmed = window.confirm(
        "This notification outcome is uncertain: the server or connection failed after message data was transmitted. Delivery may already have occurred. Proceeding may result in a duplicate email to the recipient.\n\nDo you want to retry anyway?"
      )
      if (!confirmed) return
    }
    setBusy(true)
    setResult("")
    try {
      const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(String(id))}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledgeDuplicate: isUncertain }),
      })
      const body = (await response.json()) as { ok?: boolean; message?: string }
      setResult(body.message || (response.ok ? "Notification queued." : "Retry was not queued."))
      if (response.ok) {
        router.refresh()
      }
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
        {busy ? "Queueing…" : isUncertain ? "Retry uncertain notification" : "Retry failed notification"}
      </button>
      {result && <span role="status">{result}</span>}
    </div>
  )
}
