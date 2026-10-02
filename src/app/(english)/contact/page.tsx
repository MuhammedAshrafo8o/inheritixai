import { ContactRoute, contactMetadata } from "@/site/routes"

export const generateMetadata = () => contactMetadata("en")

export default function Page() {
  return <ContactRoute locale="en" />
}
