import { createClient } from '@/lib/supabase/server'
import IsgSaglikTaramasiBilgileriClient from '@/components/isg/IsgSaglikTaramasiBilgileriClient'
import { isgSaglikTaramasiBilgiSnapshot } from '@/lib/rapor-isg-saglik-taramasi-bilgileri'

const MIN_YIL = 2000
const MAX_YIL = 2035

export default async function IsgSaglikTaramasiBilgileriPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed)
    ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
    : new Date().getFullYear()

  const supabase = await createClient()
  const satirlar = await isgSaglikTaramasiBilgiSnapshot(supabase, yil)

  return (
    <IsgSaglikTaramasiBilgileriClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      satirlar={satirlar}
      raporBasePath="/isg/raporlar/saglik-taramasi-bilgileri"
      excelBasePath="/api/isg/raporlar/saglik-taramasi-bilgileri/excel"
    />
  )
}
