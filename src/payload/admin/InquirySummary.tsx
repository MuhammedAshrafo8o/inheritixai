"use client"

import React, { useEffect, useState } from "react"

type Summary = { unread: number; attention: number }

async function totalFor(query: string, signal: AbortSignal) {
  const response = await fetch(`/api/inquiry-records?limit=1&depth=0&${query}`, { credentials: "include", signal })
  if (!response.ok) throw new Error("summary-unavailable")
  const body = await response.json() as { totalDocs?: number }
  return Number(body.totalDocs || 0)
}

export function InquirySummary() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      totalFor("where[unread][equals]=true", controller.signal),
      totalFor("where[notificationStatus][equals]=failed", controller.signal),
      totalFor("where[notificationStatus][equals]=uncertain", controller.signal),
    ]).then(([unread, failed, uncertain]) => setSummary({ unread, attention: failed + uncertain })).catch(() => setSummary(null))
    return () => controller.abort()
  }, [])

  if (!summary) return null
  return (
    <div style={{ display: "flex", gap: "1.5rem", marginBlock: "1rem", padding: "1rem", border: "1px solid var(--theme-elevation-150)", borderRadius: "var(--style-radius-s)" }}>
      <strong>Unread inquiries: {summary.unread}</strong>
      <span>Failed or uncertain notifications: {summary.attention}</span>
    </div>
  )
}
