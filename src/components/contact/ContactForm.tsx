"use client"

import React, { FormEvent, useEffect, useState } from "react"
import { Arrow } from "../ui/Icons"

interface ContactFormProps {
  lang: "en" | "ar"
  directEmail?: string
  directNote?: string
  boundaryNotice?: string
}

export function ContactForm({
  lang,
  directEmail = "hello@inheritix.com",
  directNote = lang === "ar"
    ? "للشراكات وفرص العمل والاستفسارات العامة، استخدم الاستفسار العام."
    : "For partnerships, careers, and everything else, use general inquiry.",
  boundaryNotice = lang === "ar"
    ? "ملاحظة: معالجة النماذج الرقمية وإشعارات البريد الإلكتروني مجدولة للمرحلة الثالثة. يرجى التواصل مباشرة عبر hello@inheritix.com."
    : "Milestone Two Notice: Automated form submission persistence and email dispatch are scheduled for Milestone Three. For immediate requests, please email our team directly at hello@inheritix.com.",
}: ContactFormProps) {
  const [type, setType] = useState<"project" | "demo" | "general">("project")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submittedAttempt, setSubmittedAttempt] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("type=demo")) {
      setType("demo")
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextErrors: Record<string, string> = {}

    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const message = String(data.get("message") || "").trim()

    if (!name) {
      nextErrors.name = lang === "ar" ? "يرجى كتابة الاسم." : "Please add your name."
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = lang === "ar" ? "أدخل بريد عمل صحيح." : "Enter a valid work email."
    }
    if (!message) {
      nextErrors.message = lang === "ar" ? "أخبرنا قليلاً عن احتياجاتك." : "Tell us a little about what you need."
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0) {
      // Form fields are valid, but truthful boundary is shown
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
      <div className="contact-tabs">
        {(
          [
            ["project", lang === "ar" ? "استفسار مشروع" : "Project inquiry"],
            ["demo", lang === "ar" ? "طلب عرض للمنتج" : "Product demo"],
            ["general", lang === "ar" ? "استفسار عام" : "General inquiry"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            className={type === value ? "active" : ""}
            onClick={() => {
              setType(value)
              setSubmittedAttempt(false)
            }}
            key={value}
          >
            <span>
              {value === "project" ? "01" : value === "demo" ? "02" : "03"}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="contact-form-container">
        {submittedAttempt && (
          <div
            className="boundary-alert"
            role="status"
            style={{
              padding: "1.25rem 1.5rem",
              marginBottom: "2rem",
              borderRadius: "4px",
              border: "1px solid var(--accent, #00CCFF)",
              backgroundColor: "rgba(0, 204, 255, 0.08)",
              color: "inherit",
              lineHeight: 1.6,
            }}
          >
            <strong>{lang === "ar" ? "حالة الخدمة:" : "Submission Status:"}</strong>{" "}
            {boundaryNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-intro">
            <span className="eyebrow">{type.toUpperCase()}</span>
            <h2>
              {type === "project"
                ? lang === "ar"
                  ? "أخبرنا عن التحدي الخاص بك."
                  : "Tell us about the challenge."
                : type === "demo"
                  ? lang === "ar"
                    ? "شاهد المنتج في سير عملك."
                    : "See the product in your workflow."
                  : lang === "ar"
                    ? "كيف يمكننا مساعدتك؟"
                    : "How can we help?"}
            </h2>
          </div>

          <label>
            {lang === "ar" ? "الاسم الكامل" : "Full name"}
            <input
              name="name"
              placeholder={lang === "ar" ? "اسمك الكامل" : "Your name"}
              aria-invalid={!!errors.name}
            />
            {errors.name && <small role="alert">{errors.name}</small>}
          </label>

          <label>
            {lang === "ar" ? "بريد العمل الإلكتروني" : "Work email"}
            <input
              name="email"
              type="email"
              placeholder="you@company.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <small role="alert">{errors.email}</small>}
          </label>

          {type === "demo" && (
            <label>
              {lang === "ar" ? "المنتج" : "Product"}
              <select name="product">
                <option value="LOGISTTEX">LOGISTTEX</option>
                <option value="Fen El Menu">Fen El Menu</option>
              </select>
            </label>
          )}

          {type === "project" && (
            <label>
              {lang === "ar" ? "ما نوع المشروع الذي تفكر به؟" : "What are you considering?"}
              <select name="service">
                <option value="Custom software">
                  {lang === "ar" ? "برمجيات مخصصة" : "Custom software"}
                </option>
                <option value="SaaS platform">
                  {lang === "ar" ? "منصة SaaS" : "SaaS platform"}
                </option>
                <option value="ERP / business system">
                  {lang === "ar" ? "أنظمة ERP وإدارة الأعمال" : "ERP / business system"}
                </option>
                <option value="Mobile application">
                  {lang === "ar" ? "تطبيقات الجوال" : "Mobile application"}
                </option>
                <option value="AI automation">
                  {lang === "ar" ? "أتمتة الذكاء الاصطناعي" : "AI automation"}
                </option>
                <option value="WordPress development">
                  {lang === "ar" ? "تطوير ووردبريس" : "WordPress development"}
                </option>
              </select>
            </label>
          )}

          <label>
            {lang === "ar" ? "رسالتك" : "Your message"}
            <textarea
              name="message"
              rows={5}
              placeholder={
                lang === "ar"
                  ? "نبذة موجزة تساعدنا على الاستعداد..."
                  : "A little context helps us prepare..."
              }
              aria-invalid={!!errors.message}
            />
            {errors.message && <small role="alert">{errors.message}</small>}
          </label>

          <button className="submit" type="submit">
            {lang === "ar" ? "إرسال الاستفسار" : "Send inquiry"} <Arrow />
          </button>
        </form>
      </div>

      <aside className="contact-note">
        <span>{lang === "ar" ? "التواصل المباشر" : "DIRECT CONTACT"}</span>
        <a href={`mailto:${directEmail}`}>{directEmail}</a>
        <p>{directNote}</p>
      </aside>
    </section>
  )
}
