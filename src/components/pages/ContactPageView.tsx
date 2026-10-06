import React from "react"
import { PageHero } from "../ui/PageHero"
import { ContactForm, type ContactChoice } from "../contact/ContactForm"
import type { Locale } from "@/content/types"
import type { PageContact } from "@/payload-types"

interface ContactPageViewProps {
  lang: Locale
  contact: PageContact
  products: ContactChoice[]
  services: ContactChoice[]
}

export function ContactPageView({ lang, contact, products, services }: ContactPageViewProps) {
  return (
    <main className="contact-page">
      <PageHero kicker={contact.kicker} title={contact.title} intro={contact.intro} />

      <ContactForm
        copy={contact.form ?? {}}
        lang={lang}
        directEmail={contact.directEmail}
        directNote={contact.directNote}
        products={products}
        services={services}
      />
    </main>
  )
}
