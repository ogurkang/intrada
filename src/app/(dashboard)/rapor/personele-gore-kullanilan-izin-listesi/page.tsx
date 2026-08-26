import { createClient } from '@/lib/supabase/server'
import PersoneleGoreIzinListesiClient from '@/components/rapor/PersoneleGoreIzinListesiClient'
import { yuklePersoneleGoreKullanilanIzinListesi } from '@/lib/rapor-personele-gore-izin-listesi'

const MIN_YIL = 2000
const MAX_YIL = 2035

export default async function PersoneleGoreKullanilanIzinListesiPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()

  const supabase = await createClient()
  const { satirlar, hata } = await yuklePersoneleGoreKullanilanIzinListesi(supabase, yil)

  const tumMudurlukler = [...new Set(satirlar.map(r => r.mudurluk).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )
  const tumTurler = [...new Set(satirlar.map(r => r.tur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <>
      {hata ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Rapor yüklenirken hata: {hata}
        </div>
      ) : null}
      <PersoneleGoreIzinListesiClient
        yil={yil}
        minYil={MIN_YIL}
        maxYil={MAX_YIL}
        satirlar={satirlar}
        tumMudurlukler={tumMudurlukler}
        tumTurler={tumTurler}
        raporBasePath="/rapor/personele-gore-kullanilan-izin-listesi"
        excelBasePath="/api/rapor/personele-gore-kullanilan-izin-listesi/excel"
      />
    </>
  )
}
