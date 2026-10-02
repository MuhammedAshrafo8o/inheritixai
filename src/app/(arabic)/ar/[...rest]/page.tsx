import { CatchAllRoute } from "@/site/routes"

type Props = { params: Promise<{ rest: string[] }> }

export default async function Page({ params }: Props) {
  return <CatchAllRoute locale="ar" segments={(await params).rest} />
}
