import { ServicesRoute, servicesMetadata } from "@/site/routes"

export const generateMetadata = () => servicesMetadata("en")

export default function Page() {
  return <ServicesRoute locale="en" />
}
