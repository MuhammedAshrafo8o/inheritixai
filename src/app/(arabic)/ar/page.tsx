import { HomeRoute, homeMetadata } from "@/site/routes"

export const generateMetadata = () => homeMetadata("ar")

export default function Page() {
  return <HomeRoute locale="ar" />
}
