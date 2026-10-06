"use client"

import { useState } from "react"

export function EmailSettingsActions() {
  const [result, setResult] = useState("")
  const [busy, setBusy] = useState<"verify" | "test" | null>(null)

  async function run(action: "verify" | "test") {
    if (busy) return
    setBusy(action)
    setResult("")
    try {
      const response = await fetch(`/api/admin/email/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const body = (await response.json()) as { message?: string }
      setResult(body.message || (response.ok ? "Check completed." : "Check failed."))
    } catch {
      setResult("The check could not be completed.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ marginBlock: 20 }}>
      <p><strong>SMTP checks</strong></p>
      <p>Save current settings first. Connection verification does not send mail; a test email asks SMTP to accept a message for the configured recipient.</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn--style-secondary btn--size-medium" type="button" onClick={() => run("verify")} disabled={busy !== null}>
          {busy === "verify" ? "Verifying…" : "Verify connection"}
        </button>
        <button className="btn btn--style-primary btn--size-medium" type="button" onClick={() => run("test")} disabled={busy !== null}>
          {busy === "test" ? "Sending…" : "Send test email"}
        </button>
        {result && <span role="status">{result}</span>}
      </div>
    </div>
  )
}
