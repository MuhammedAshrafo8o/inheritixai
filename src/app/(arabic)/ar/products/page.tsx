import { ProductsRoute, productsMetadata } from "@/site/routes"

export const generateMetadata = () => productsMetadata("ar")

export default function Page() {
  return <ProductsRoute locale="ar" />
}
