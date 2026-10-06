"use client"

import React, { FormEvent, useEffect, useRef, useState } from "react"
import { Arrow } from "../ui/Icons"
import type { Locale } from "@/content/types"

const copyKeys = [
  "directContactLabel", "projectTab", "demoTab", "generalTab", "projectHeading", "demoHeading", "generalHeading",
  "nameLabel", "namePlaceholder", "emailLabel", "emailPlaceholder", "productLabel", "serviceLabel", "messageLabel",
  "messagePlaceholder", "submitLabel", "statusLabel", "nameError", "emailError", "messageError", "submittingLabel",
  "successTitle", "successMessage", "referenceLabel", "validationSummary", "rateLimitedMessage", "temporaryFailureMessage",
  "conflictMessage", "retryLabel", "productRequiredError", "serviceRequiredError", "selectionUnavailableMessage",
  "generalInquiryLink", "honeypotLabel",
] as const

export type ContactFormCopy = Partial<Record<(typeof copyKeys)[number], string | null>>
export type ContactChoice = { id: string; slug: string; label: string }
type InquiryType = "project" | "demo" | "general"
type FormState = "idle" | "submitting" | "success" | "validation" | "rate-limited" | "failure" | "conflict"

interface ContactFormProps {
  copy: ContactFormCopy
  lang: Locale
  directEmail?: string | null
  directNote?: string | null
  products: ContactChoice[]
  services: ContactChoice[]
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""
}

export function ContactForm({ copy, lang, directEmail, directNote, products, services }: ContactFormProps) {
  const [type, setType] = useState<InquiryType>("project")
  const [values, setValues] = useState({ name: "", email: "", message: "", productId: "", serviceId: "", website: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<FormState>("idle")
  const [reference, setReference] = useState("")
  const key = useRef("")
  const attemptRef = useRef(0)
  const submittedPayloadRef = useRef<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedType = params.get("type")
    const nextType: InquiryType = requestedType === "demo" || requestedType === "general" || requestedType === "project" ? requestedType : "project"
    const product = products.find((item) => item.slug === params.get("product"))
    const service = services.find((item) => item.slug === params.get("service"))
    setType(nextType)
    setValues((current) => ({ ...current, productId: product?.id || "", serviceId: service?.id || "" }))
  }, [products, services])

  const tabs = ([
    ["project", copy.projectTab], ["demo", copy.demoTab], ["general", copy.generalTab],
  ] as Array<[InquiryType, string | null | undefined]>).filter(([, label]) => Boolean(label))
  const heading = { project: copy.projectHeading, demo: copy.demoHeading, general: copy.generalHeading }[type]
  const tabLabel = tabs.find(([value]) => value === type)?.[1]
  const unavailable = (type === "demo" && products.length === 0) || (type === "project" && services.length === 0)

  function changeType(next: InquiryType) {
    if (state === "submitting" || next === type) return
    setType(next)
    setErrors({})
    setState("idle")
    setReference("")
    key.current = newKey()
    submittedPayloadRef.current = null
  }

  function update(field: keyof typeof values, value: string) {
    if (state === "submitting") return
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    if (submittedPayloadRef.current !== null) {
      key.current = newKey()
      submittedPayloadRef.current = null
    }
    setState("idle")
  }

  function validate() {
    const next: Record<string, string> = {}
    if (values.name.trim().length < 2 || values.name.trim().length > 120) next.name = copy.nameError || ""
    if (values.email.length > 254 || !/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = copy.emailError || ""
    if (values.message.trim().length < 10 || values.message.trim().length > 5000) next.message = copy.messageError || ""
    if (type === "demo" && !values.productId) next.productId = copy.productRequiredError || ""
    if (type === "project" && !values.serviceId) next.serviceId = copy.serviceRequiredError || ""
    return next
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === "submitting" || unavailable) return
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setState("validation")
      focusFirstInvalid()
      return
    }

    if (!key.current) key.current = newKey()
    if (!key.current) {
      setState("failure")
      return
    }

    const payloadObj = {
      type,
      locale: lang,
      name: values.name,
      email: values.email,
      message: values.message,
      productId: type === "demo" ? values.productId : undefined,
      serviceId: type === "project" ? values.serviceId : undefined,
      sourcePath: `${window.location.pathname}${window.location.search}`.slice(0, 512),
      attribution: {
        utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
        utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        referrer: document.referrer || undefined,
      },
      idempotencyKey: key.current,
      website: values.website,
    }

    submittedPayloadRef.current = JSON.stringify(payloadObj)
    const currentAttempt = ++attemptRef.current
    setState("submitting")
    setErrors({})

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadObj),
      })
      const body = (await response.json()) as { code?: string; reference?: string; fields?: Record<string, string> }

      if (currentAttempt !== attemptRef.current) return

      if (response.ok) {
        setReference(body.reference || "")
        setState("success")
        return
      }

      if (response.status === 400 && body.fields) {
        const mapped: Record<string, string> = {}
        for (const field of Object.keys(body.fields)) {
          if (field === "name") mapped.name = copy.nameError || ""
          else if (field === "email") mapped.email = copy.emailError || ""
          else if (field === "message") mapped.message = copy.messageError || ""
          else if (field === "productId") mapped.productId = copy.productRequiredError || ""
          else if (field === "serviceId") mapped.serviceId = copy.serviceRequiredError || ""
        }
        setErrors(mapped)
        setState("validation")
        focusFirstInvalid()
        return
      }

      setState(response.status === 429 ? "rate-limited" : response.status === 409 ? "conflict" : "failure")
      if (response.status === 409) {
        key.current = newKey()
        submittedPayloadRef.current = null
      }
    } catch {
      if (currentAttempt !== attemptRef.current) return
      setState("failure")
    }
  }

  const statusMessage = state === "validation" ? copy.validationSummary
    : state === "rate-limited" ? copy.rateLimitedMessage
      : state === "conflict" ? copy.conflictMessage
        : state === "failure" ? copy.temporaryFailureMessage : null

  return (
    <section className="contact-layout page-pad">
      {tabs.length > 0 && <div className="contact-tabs" role="tablist">
        {tabs.map(([value, label], index) => (
          <button
            type="button"
            role="tab"
            aria-selected={type === value}
            className={type === value ? "active" : ""}
            onClick={() => changeType(value)}
            disabled={state === "submitting"}
            key={value}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>{label}
          </button>
        ))}
      </div>}

      <div className="contact-form-container">
        {state === "success" ? (
          <div className="contact-result" role="status" tabIndex={-1}>
            {copy.successTitle && <h2>{copy.successTitle}</h2>}
            {copy.successMessage && <p>{copy.successMessage}</p>}
            {reference && copy.referenceLabel && <p><strong>{copy.referenceLabel}:</strong> {reference}</p>}
          </div>
        ) : <form onSubmit={handleSubmit} noValidate aria-busy={state === "submitting"}>
          {(tabLabel || heading) && <div className="form-intro">{tabLabel && <span className="eyebrow">{tabLabel.toUpperCase()}</span>}{heading && <h2>{heading}</h2>}</div>}
          {statusMessage && <div className="form-status" role="alert">{statusMessage}</div>}

          <fieldset disabled={state === "submitting"} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
            <label>{copy.nameLabel}<input name="name" value={values.name} onChange={(e) => update("name", e.target.value)} maxLength={120} autoComplete="name" placeholder={copy.namePlaceholder || undefined} aria-invalid={!!errors.name} aria-describedby={errors.name ? "contact-name-error" : undefined} />{errors.name && <small id="contact-name-error">{errors.name}</small>}</label>
            <label>{copy.emailLabel}<input name="email" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} maxLength={254} autoComplete="email" placeholder={copy.emailPlaceholder || undefined} aria-invalid={!!errors.email} aria-describedby={errors.email ? "contact-email-error" : undefined} />{errors.email && <small id="contact-email-error">{errors.email}</small>}</label>

            {type === "demo" && products.length > 0 && <label>{copy.productLabel}<select name="productId" value={values.productId} onChange={(e) => update("productId", e.target.value)} aria-invalid={!!errors.productId} aria-describedby={errors.productId ? "contact-product-error" : undefined}><option value=""></option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{errors.productId && <small id="contact-product-error">{errors.productId}</small>}</label>}
            {type === "project" && services.length > 0 && <label>{copy.serviceLabel}<select name="serviceId" value={values.serviceId} onChange={(e) => update("serviceId", e.target.value)} aria-invalid={!!errors.serviceId} aria-describedby={errors.serviceId ? "contact-service-error" : undefined}><option value=""></option>{services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{errors.serviceId && <small id="contact-service-error">{errors.serviceId}</small>}</label>}

            {unavailable && <div className="form-status" role="status">{copy.selectionUnavailableMessage}{copy.generalInquiryLink && <button type="button" className="text-action" onClick={() => changeType("general")}>{copy.generalInquiryLink}</button>}</div>}
            <label>{copy.messageLabel}<textarea name="message" rows={5} value={values.message} onChange={(e) => update("message", e.target.value)} maxLength={5000} placeholder={copy.messagePlaceholder || undefined} aria-invalid={!!errors.message} aria-describedby={errors.message ? "contact-message-error" : undefined} />{errors.message && <small id="contact-message-error">{errors.message}</small>}</label>
            <label className="contact-honeypot">{copy.honeypotLabel}<input name="website" value={values.website} onChange={(e) => update("website", e.target.value)} tabIndex={-1} autoComplete="off" /></label>
            <button className="submit" type="submit" disabled={state === "submitting" || unavailable}>{state === "submitting" ? copy.submittingLabel : state === "failure" || state === "rate-limited" ? copy.retryLabel : copy.submitLabel} <Arrow /></button>
          </fieldset>
        </form>}
      </div>

      {(directEmail || directNote) && <aside className="contact-note">{copy.directContactLabel && <span>{copy.directContactLabel}</span>}{directEmail && <a href={`mailto:${directEmail}`}>{directEmail}</a>}{directNote && <p>{directNote}</p>}</aside>}
    </section>
  )
}
