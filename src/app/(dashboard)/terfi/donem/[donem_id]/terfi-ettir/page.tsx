import { redirect } from 'next/navigation'

/** Eski URL uyumluluğu: önizleme artık dönem detayında. */
export default async function TerfiEttirLegacyRedirect({
  params,
}: {
  params: Promise<{ donem_id: string }>
}) {
  const { donem_id } = await params
  redirect(`/terfi/donem/${donem_id}`)
}
