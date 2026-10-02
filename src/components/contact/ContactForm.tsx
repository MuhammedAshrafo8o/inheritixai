"use client"

import React, { FormEvent, useEffect, useState } from "react"
import { Arrow } from "../ui/Icons"

/** Contact form copy from the Contact Page global (`form` group). */
export type ContactFormCopy = Partial<
  Record<
    | "directContactLabel"
    | "projectTab"
    | "demoTab"
    | "generalTab"
    | "projectHeading"
    | "demoHeading"
    | "generalHeading"
    | "nameLabel"
    | "namePlaceholder"
    | "emailLabel"
    | "emailPlaceholder"
    | "productLabel"
    | "serviceLabel"
    | "messageLabel"
    | "messagePlaceholder"
    | "submitLabel"
    | "statusLabel"
    | "nameError"
    | "emailError"
    | "messageError",
    string | null
  >
>

interface ContactFormProps {
  copy: ContactFormCopy
  directEmail?: string | null
  directNote?: string | null
  boundaryNotice?: string | null
  /** Published product names (demo requests). */
  products: string[]
  /** Published service titles (project inquiries). */
  services: string[]
}

type InquiryType = "project" | "demo" | "general"

export function ContactForm({ copy, directEmail, directNote, boundaryNotice, products, services }: ContactFormProps) {
  const [type, setType] = useState<InquiryType>("project")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submittedAttempt, setSubmittedAttempt] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("type=demo")) {
      setType("demo")
    }
  }, [])

  const tabs = (
    [
      ["project", copy.projectTab],
      ["demo", copy.demoTab],
      ["general", copy.generalTab],
    ] as Array<[InquiryType, string | null | undefined]>
  ).filter(([, label]) => Boolean(label))

  const heading = { project: copy.projectHeading, demo: copy.demoHeading, general: copy.generalHeading }[type]
  const tabLabel = tabs.find(([value]) => value === type)?.[1]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextErrors: Record<string, string> = {}

    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const message = String(data.get("message") || "").trim()

    if (!name) nextErrors.name = copy.nameError || " "
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = copy.emailError || " "
    if (!message) nextErrors.message = copy.messageError || " "

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0) {
      // Fields are valid; submission handling arrives in Milestone Three.
      setSubmittedAttempt(true)
    } else {
      setSubmittedAttempt(false)
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
    }
  }

  return (
    <section className="contact-layout page-pad">
      {tabs.length > 0 && (
        <div className="contact-tabs">
          {tabs.map(([value, label], index) => (
            <button
              type="button"
              className={type === value ? "active" : ""}
              onClick={() => {
                setType(value)
                setSubmittedAttempt(false)
              }}
              key={value}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="contact-form-container">
        {submittedAttempt && boundaryNotice && (
          <div
            className="boundary-alert"
            role="status"
            style={{
              padding: "1.25rem 1.5rem",
              marginBottom: "2rem",
              borderRadius: "4px",
              border: "1px solid var(--cyan)",
              backgroundColor: "rgba(0, 204, 255, 0.08)",
              color: "inherit",
              lineHeight: 1.6,
            }}
          >
            {copy.statusLabel && <strong>{copy.statusLabel}</strong>} {boundaryNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {(tabLabel || heading) && (
            <div className="form-intro">
              {tabLabel && <span className="eyebrow">{tabLabel.toUpperCase()}</span>}
              {heading && <h2>{heading}</h2>}
            </div>
          )}

          <label>
            {copy.nameLabel}
            <input name="name" placeholder={copy.namePlaceholder || undefined} aria-invalid={!!errors.name} />
            {errors.name?.trim() && <small role="alert">{errors.name}</small>}
          </label>

          <label>
            {copy.emailLabel}
            <input
              name="email"
              type="email"
              placeholder={copy.emailPlaceholder || undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email?.trim() && <small role="alert">{errors.email}</small>}
          </label>

          {type === "demo" && products.length > 0 && (
            <label>
              {copy.productLabel}
              <select name="product">
                {products.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {type === "project" && services.length > 0 && (
            <label>
              {copy.serviceLabel}
              <select name="service">
                {services.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            {copy.messageLabel}
            <textarea
              name="message"
              rows={5}
              placeholder={copy.messagePlaceholder || undefined}
              aria-invalid={!!errors.message}
            />
            {errors.message?.trim() && <small role="alert">{errors.message}</small>}
          </label>

          <button className="submit" type="submit">
            {copy.submitLabel} <Arrow />
          </button>
        </form>
      </div>

      {(directEmail || directNote) && (
        <aside className="contact-note">
          {copy.directContactLabel && <span>{copy.directContactLabel}</span>}
          {directEmail && <a href={`mailto:${directEmail}`}>{directEmail}</a>}
          {directNote && <p>{directNote}</p>}
        </aside>
      )}
    </section>
  )
}
