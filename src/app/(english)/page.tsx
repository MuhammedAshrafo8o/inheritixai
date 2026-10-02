import { HomeRoute, homeMetadata } from "@/site/routes"

export const generateMetadata = () => homeMetadata("en")

export default function Page() {
  return <HomeRoute locale="en" />
}
