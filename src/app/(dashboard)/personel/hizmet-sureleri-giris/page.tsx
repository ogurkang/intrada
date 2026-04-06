import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HizmetSureleriGirisClient from '@/components/personel/HizmetSureleriGirisClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { hizmetSureleriSatirKaydet, hizmetSureleriTopluKaydet } from './actions'

export default async function HizmetSureleriGirisPage() {
  const supabase = await createClient()

  const [{ data: calisanRaw, error }, { data: phRaw }] = await Promise.all([
    supabase
      .from('calisan')
      .select(
        'sicil_no, public_id, ad_soyad, tckn, gorev_turu, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun',
      )
      .order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })
  const data = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Hizmet Süreleri</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <HizmetSureleriGirisClient
        data={
          data as Pick<
            Tables<'calisan'>,
            | 'sicil_no'
            | 'public_id'
            | 'ad_soyad'
            | 'tckn'
            | 'gorev_turu'
            | 'hizmet_suresi_yil'
            | 'hizmet_suresi_ay'
            | 'hizmet_suresi_gun'
          >[]
        }
        onSatirKaydet={hizmetSureleriSatirKaydet}
        onTopluKaydet={hizmetSureleriTopluKaydet}
      />
    </div>
  )
}
