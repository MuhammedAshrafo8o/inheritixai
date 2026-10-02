import { InsightsRoute, insightsMetadata } from "@/site/routes"

export const generateMetadata = () => insightsMetadata("ar")

export default function Page() {
  return <InsightsRoute locale="ar" />
}
