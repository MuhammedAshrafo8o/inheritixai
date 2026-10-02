import React from "react"
import { PageHero } from "../ui/PageHero"
import { ContactForm } from "../contact/ContactForm"
import type { Locale } from "@/content/types"
import type { PageContact } from "@/payload-types"

interface ContactPageViewProps {
  lang: Locale
  contact: PageContact
  products: string[]
  services: string[]
}

export function ContactPageView({ contact, products, services }: ContactPageViewProps) {
  return (
    <main className="contact-page">
      <PageHero kicker={contact.kicker} title={contact.title} intro={contact.intro} />

      <ContactForm
        copy={contact.form ?? {}}
        directEmail={contact.directEmail}
        directNote={contact.directNote}
        boundaryNotice={contact.boundaryNotice}
        products={products}
        services={services}
      />
    </main>
  )
}
