import { createClient } from '@/lib/supabase/server'
import StatuIzinleriRaporClient from '@/components/rapor/StatuIzinleriRaporClient'
import { parseMudurlukParam } from '@/lib/rapor-memur-izinleri'
import { yukleStatuIzinRaporVerisi } from '@/lib/rapor-statu-izinleri-load'

const MIN_YIL = 2000
const MAX_YIL = 2035

const RAPOR_ACIKLAMA =
  'Sadece Memur statüsündeki aktif personeller listelenir. YILLIK sekmede kullanılan izin yıl toplamı; aylık sekmelerde sadece seçilen ayda kullanılan izin gösterilir. Devreden ve hak edilen izin günleri ayrı sütunlarda sunulur.'

export default async function MemurIzinleriRaporuPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed)
    ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
    : new Date().getFullYear()
  const initialMudurlukler = parseMudurlukParam(sp.m)

  const supabase = await createClient()
  const { tabs, tumMudurlukler } = await yukleStatuIzinRaporVerisi(supabase, {
    statuTip: 'memur',
    yil,
  })

  return (
    <StatuIzinleriRaporClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumMudurlukler={tumMudurlukler}
      initialMudurlukler={initialMudurlukler}
      raporBasePath="/rapor/memur-izinleri"
      excelBasePath="/api/rapor/memur-izinleri/excel"
      baslik="Memur İzinleri Raporu"
      aciklama={RAPOR_ACIKLAMA}
      statuEtiket="Memur"
    />
  )
}
