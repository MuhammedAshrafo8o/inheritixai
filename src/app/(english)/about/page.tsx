import { AboutRoute, aboutMetadata } from "@/site/routes"

export const generateMetadata = () => aboutMetadata("en")

export default function Page() {
  return <AboutRoute locale="en" />
}
