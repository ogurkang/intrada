import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GorevBilgileriListeClient from '@/components/personel/GorevBilgileriListeClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { gorevBilgileriSatirKaydet, gorevBilgileriTopluKaydet } from './actions'

export default async function GorevBilgileriPage() {
  const supabase = await createClient()

  const [{ data: calisanRaw, error }, { data: phRaw }] = await Promise.all([
    supabase
      .from('calisan')
      .select(
        'sicil_no, public_id, ad_soyad, gorev_yeri, gorev_turu, gorev_turu_tarihi, gorev_durumu',
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
        <span className="text-slate-800 font-medium">Görev Bilgileri</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <GorevBilgileriListeClient
        data={
          data as Pick<
            Tables<'calisan'>,
            | 'sicil_no'
            | 'public_id'
            | 'ad_soyad'
            | 'gorev_yeri'
            | 'gorev_turu'
            | 'gorev_turu_tarihi'
            | 'gorev_durumu'
          >[]
        }
        onSatirKaydet={gorevBilgileriSatirKaydet}
        onTopluKaydet={gorevBilgileriTopluKaydet}
      />
    </div>
  )
}
