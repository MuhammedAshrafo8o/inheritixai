import { ProductsRoute, productsMetadata } from "@/site/routes"

export const generateMetadata = () => productsMetadata("en")

export default function Page() {
  return <ProductsRoute locale="en" />
}
