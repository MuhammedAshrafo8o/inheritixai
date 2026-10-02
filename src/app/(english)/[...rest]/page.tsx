import { CatchAllRoute } from "@/site/routes"

type Props = { params: Promise<{ rest: string[] }> }

export default async function Page({ params }: Props) {
  return <CatchAllRoute locale="en" segments={(await params).rest} />
}
