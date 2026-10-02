import { ServicesRoute, servicesMetadata } from "@/site/routes"

export const generateMetadata = () => servicesMetadata("ar")

export default function Page() {
  return <ServicesRoute locale="ar" />
}
