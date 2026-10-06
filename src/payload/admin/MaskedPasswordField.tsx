"use client"

import React, { useEffect, useRef } from "react"
import { useField, useDocumentInfo } from "@payloadcms/ui"
import type { TextFieldClientProps } from "payload"

export function MaskedPasswordField(props: TextFieldClientProps) {
  const path = props.path || props.field?.name || "smtpPassword"
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({ path })
  const { lastUpdateTime } = useDocumentInfo()
  const initialUpdateTime = useRef(lastUpdateTime)

  // Clear the entered secret from the form after successful saving
  useEffect(() => {
    if (lastUpdateTime && lastUpdateTime !== initialUpdateTime.current) {
      initialUpdateTime.current = lastUpdateTime
      setValue("", true)
    }
  }, [lastUpdateTime, setValue])

  const label = props.field?.label || "SMTP Password"
  const description =
    props.field?.admin?.description ||
    "Leave blank to preserve the current password. A supplied value replaces it."

  return (
    <div className="field-type text" style={{ marginBottom: "1.5rem" }}>
      <label className="field-label" htmlFor={`field-${path}`}>
        {typeof label === "string" ? label : "SMTP Password"}
      </label>
      <div className="input-wrapper">
        <input
          id={`field-${path}`}
          name={path}
          type="password"
          autoComplete="new-password"
          className="field-type__input"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="••••••••••••"
          style={{ width: "100%", padding: "10px 14px", borderRadius: "4px" }}
        />
      </div>
      {showError && errorMessage && (
        <div className="field-error" style={{ color: "var(--theme-error-500)", marginTop: "4px" }}>
          {errorMessage}
        </div>
      )}
      {description && (
        <div className="field-description" style={{ color: "var(--theme-elevation-400)", marginTop: "4px", fontSize: "0.875rem" }}>
          {typeof description === "string" ? description : null}
        </div>
      )}
    </div>
  )
}
