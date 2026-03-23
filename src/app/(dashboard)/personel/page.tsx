import { createClient } from '@/lib/supabase/server'
import PersonelListClient from '@/components/personel/PersonelListClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'

export default async function PersonelPage() {
  const supabase = await createClient()

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
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })
  const data = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

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
