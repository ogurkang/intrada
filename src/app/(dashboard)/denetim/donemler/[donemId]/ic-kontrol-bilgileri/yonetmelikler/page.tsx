import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = Number.parseInt((await params).donemId, 10)
  redirect(`/denetim/donemler/${donemId}/yonetmelikler`)
}
