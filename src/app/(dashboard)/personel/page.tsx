import { createClient } from '@/lib/supabase/server'
import PersonelListClient from '@/components/personel/PersonelListClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function PersonelPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw, error }, { data: phRaw }] = await Promise.all([
    supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad, tckn, dogum_tarihi')
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
  const aktifAdaySiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifAdaySiciller.add(c.sicil_no)
  })

  // Personel listesinde yalnızca aktif kadro satırı bulunan asıl personeli göster.
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  const adaylar = [...aktifAdaySiciller]
  for (const part of chunk(adaylar, 120)) {
    if (part.length === 0) continue
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  const data = calisanFiltreli.filter(c => {
    if (!aktifAdaySiciller.has(c.sicil_no)) return false
    const rows = kadroByAsil.get(c.sicil_no) ?? []
    return Boolean(secilenKadroSatirAsil(rows, D))
  })

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <PersonelListClient
        data={data as Pick<Tables<'calisan'>, 'sicil_no' | 'public_id' | 'ad_soyad' | 'tckn' | 'dogum_tarihi'>[]}
      />
    </>
  )
}
