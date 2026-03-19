import { createClient } from '@/lib/supabase/server'
import TerfiClient from '@/components/personel/TerfiClient'
import { terfiEkle, terfiGuncelle, terfiSil, terfiTopluKaydet } from './actions'
import type { Tables } from '@/types/database'

export default async function TerfiPage() {
  const supabase = await createClient()

  const [{ data: kayitlar }, { data: calisanlar }, { data: kadroOzet }, { data: phRaw }] = await Promise.all([
    supabase
      .from('terfi_hareketleri')
      .select('*')
      .order('sicil_no'),
    supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .order('sicil_no'),
    supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, ad_soyad, gorev_unvani, gorev_mudurlugu, statu')
      .order('sicil_no'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const aktifSiciller = new Set<string>()
  ;(calisanlar ?? []).forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })

  const calisanMap = new Map((calisanlar ?? []).map(c => [c.sicil_no, c]))
  const kadroMap = new Map((kadroOzet ?? []).map(k => [k.sicil_no, k]))

  const terfiMap: Record<string, Tables<'terfi_hareketleri'>> = {}
  for (const k of (kayitlar ?? [])) {
    if (!terfiMap[k.sicil_no] || k.kayit_zamani > terfiMap[k.sicil_no].kayit_zamani) {
      terfiMap[k.sicil_no] = k
    }
  }

  const memurSiciller = [...aktifSiciller].filter(sicil => {
    const k = kadroMap.get(sicil) as { statu?: string } | undefined
    return k?.statu === 'Memur'
  })

  const memurlar = [...memurSiciller]
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
    .map(sicil_no => {
      const c = calisanMap.get(sicil_no)
      const k = kadroMap.get(sicil_no)
      return {
        sicil_no,
        ad_soyad:             c?.ad_soyad ?? k?.ad_soyad ?? sicil_no,
        gorev_unvani:         k?.gorev_unvani ?? null,
        gorev_mudurlugu:      k?.gorev_mudurlugu ?? null,
        terfi:                terfiMap[sicil_no] ?? null,
      }
    })

  return (
    <TerfiClient
      kayitlar={kayitlar ?? []}
      calisanlar={(calisanlar ?? []).map(c => ({
        sicil_no:  c.sicil_no,
        ad_soyad:  c.ad_soyad ?? c.sicil_no,
        unvan:     null,
        mudurluk:  null,
      }))}
      memurlar={memurlar}
      onEkle={terfiEkle}
      onGuncelle={terfiGuncelle}
      onSil={terfiSil}
      onTopluKaydet={terfiTopluKaydet}
    />
  )
}
