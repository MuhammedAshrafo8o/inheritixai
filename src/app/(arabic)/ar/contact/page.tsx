import { ContactRoute, contactMetadata } from "@/site/routes"

export const generateMetadata = () => contactMetadata("ar")

export default function Page() {
  return <ContactRoute locale="ar" />
}
