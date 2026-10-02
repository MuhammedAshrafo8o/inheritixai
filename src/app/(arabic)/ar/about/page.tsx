import { AboutRoute, aboutMetadata } from "@/site/routes"

export const generateMetadata = () => aboutMetadata("ar")

export default function Page() {
  return <AboutRoute locale="ar" />
}
