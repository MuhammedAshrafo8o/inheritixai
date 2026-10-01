import React from "react"
import { Dashboard } from "./Dashboard"
import { MenuPhone } from "./MenuPhone"

export function ProductStage({
  compact = false,
  stageLabel = "01 LOGISTICS, IN MOTION",
  stageNote = "Two products. One standard: clarity.",
}: {
  compact?: boolean
  stageLabel?: string
  stageNote?: string
}) {
  return (
    <div className={compact ? "product-stage compact" : "product-stage"}>
      <div className="stage-grid" />
      <div className="stage-label">
        <span>01</span> {stageLabel.replace(/^01\s*/, "")}
      </div>
      <div className="dashboard-wrap">
        <Dashboard />
      </div>
      <div className="phone-wrap">
        <MenuPhone />
      </div>
      <div className="stage-note">{stageNote}</div>
    </div>
  )
}
