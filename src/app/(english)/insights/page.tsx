import { InsightsRoute, insightsMetadata } from "@/site/routes"

export const generateMetadata = () => insightsMetadata("en")

export default function Page() {
  return <InsightsRoute locale="en" />
}
