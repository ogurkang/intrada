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

  const ogrenimTuruBySicil = new Map<string, string>()
  const khRows: {
    id: number
    asil: string | null
    vekil: string | null
    kadro_derecesi: string | null
  }[] = []

  if (memurSiciller.length > 0) {
    const [ogRes, khRes] = await Promise.all([
      supabase
        .from('calisan_ogrenim')
        .select('sicil_no, ogrenim_turu, kayit_zamani')
        .in('sicil_no', memurSiciller)
        .eq('aktif', true)
        .order('kayit_zamani', { ascending: false }),
      supabase
        .from('kadro_hareketleri')
        .select('id, asil, vekil, kadro_derecesi')
        .is('ayrilis_tarihi', null),
    ])

    const seenOg = new Set<string>()
    for (const o of ogRes.data ?? []) {
      if (seenOg.has(o.sicil_no)) continue
      seenOg.add(o.sicil_no)
      const t = (o.ogrenim_turu ?? '').trim()
      if (t) ogrenimTuruBySicil.set(o.sicil_no, t)
    }

    for (const r of khRes.data ?? []) {
      khRows.push({
        id: r.id,
        asil: r.asil,
        vekil: r.vekil,
        kadro_derecesi: r.kadro_derecesi,
      })
    }
  }

  type KadroRol = 'Asil' | 'Vekil'
  const memurlar: {
    liste_satir_id: string
    sicil_no: string
    ad_soyad: string
    gorev_unvani: string | null
    gorev_mudurlugu: string | null
    terfi: Tables<'terfi_hareketleri'> | null
    ogrenim_turu: string | null
    kadro_rolu: KadroRol | null
    kadro_derecesi: string | null
  }[] = []

  for (const sicil_no of [...memurSiciller].sort(
    (a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
  )) {
    const c = calisanMap.get(sicil_no)
    const k = kadroMap.get(sicil_no)
    const base = {
      sicil_no,
      ad_soyad: c?.ad_soyad ?? k?.ad_soyad ?? sicil_no,
      gorev_unvani: k?.gorev_unvani ?? null,
      gorev_mudurlugu: k?.gorev_mudurlugu ?? null,
      terfi: terfiMap[sicil_no] ?? null,
      ogrenim_turu: ogrenimTuruBySicil.get(sicil_no) ?? null,
    }

    const hits: { khId: number; rol: KadroRol; kadro_derecesi: string | null }[] = []
    for (const r of khRows) {
      if (r.asil === sicil_no) hits.push({ khId: r.id, rol: 'Asil', kadro_derecesi: r.kadro_derecesi })
      if (r.vekil === sicil_no) hits.push({ khId: r.id, rol: 'Vekil', kadro_derecesi: r.kadro_derecesi })
    }

    if (hits.length === 0) {
      memurlar.push({
        ...base,
        liste_satir_id: `${sicil_no}-yok`,
        kadro_rolu: null,
        kadro_derecesi: null,
      })
    } else {
      for (const h of hits) {
        memurlar.push({
          ...base,
          liste_satir_id: `${sicil_no}-kh${h.khId}-${h.rol}`,
          kadro_rolu: h.rol,
          kadro_derecesi: h.kadro_derecesi,
        })
      }
    }
  }

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
