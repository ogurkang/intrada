import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'

function eslestirOgrenimId(
  ogrenimTuru: string | null | undefined,
  tanimlar: { id: number; isim: string }[],
): number | null {
  const t = (ogrenimTuru ?? '').trim().toLowerCase()
  if (!t) return null
  for (const o of tanimlar) {
    if (o.isim.trim().toLowerCase() === t) return o.id
  }
  for (const o of tanimlar) {
    const n = o.isim.trim().toLowerCase()
    if (t.includes(n) || n.includes(t)) return o.id
  }
  return null
}

/**
 * Terfi Ettir önizlemesi için memur kaynakları + kazanç lookup haritası.
 */
export async function yukleTerfiEttirKaynakVeKazanc(
  supabase: SupabaseClient<Database>,
): Promise<{
  kaynaklar: TerfiKaynak[]
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null
}> {
  const [{ data: kayitlar }, { data: calisanlar }, { data: kadroOzet }, { data: phRaw }, { data: tanimOg }, { data: khUnvan }] =
    await Promise.all([
      supabase.from('terfi_hareketleri').select('*').order('sicil_no'),
      supabase.from('calisan').select('sicil_no, ad_soyad').order('sicil_no'),
      supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, gorev_unvani, statu').order('sicil_no'),
      supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
      supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true),
      supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, gorev_unvan_id, kadro_unvan_id, gorev_unvani, kadro_unvani, kadro_derecesi')
        .is('ayrilis_tarihi', null),
    ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const aktifSiciller = new Set<string>()
  ;(calisanlar ?? []).forEach((c) => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })

  const kadroMap = new Map((kadroOzet ?? []).map((k) => [k.sicil_no, k]))
  const terfiMap: Record<string, Tables<'terfi_hareketleri'>> = {}
  for (const k of kayitlar ?? []) {
    if (!terfiMap[k.sicil_no] || k.kayit_zamani > terfiMap[k.sicil_no].kayit_zamani) {
      terfiMap[k.sicil_no] = k
    }
  }

  const memurSiciller = [...aktifSiciller].filter((sicil) => {
    const row = kadroMap.get(sicil) as { statu?: string } | undefined
    return row?.statu === 'Memur'
  })

  const ogrenimTuruBySicil = new Map<string, string>()
  if (memurSiciller.length > 0) {
    const { data: ogRes } = await supabase
      .from('calisan_ogrenim')
      .select('sicil_no, ogrenim_turu, kayit_zamani')
      .in('sicil_no', memurSiciller)
      .eq('aktif', true)
      .order('kayit_zamani', { ascending: false })
    const seenOg = new Set<string>()
    for (const o of ogRes ?? []) {
      if (seenOg.has(o.sicil_no)) continue
      seenOg.add(o.sicil_no)
      const tt = (o.ogrenim_turu ?? '').trim()
      if (tt) ogrenimTuruBySicil.set(o.sicil_no, tt)
    }
  }

  const unvanIdBySicil = new Map<string, number>()
  const kadroUnvaniBySicil = new Map<string, string | null>()
  const kadroDerecesiBySicil = new Map<string, string | null>()
  for (const sicil of memurSiciller) {
    for (const r of khUnvan ?? []) {
      if (r.asil !== sicil && r.vekil !== sicil) continue
      kadroDerecesiBySicil.set(sicil, r.kadro_derecesi ?? null)
      kadroUnvaniBySicil.set(sicil, r.kadro_unvani ?? null)
      const uid = r.gorev_unvan_id ?? r.kadro_unvan_id
      if (uid != null) unvanIdBySicil.set(sicil, uid)
      break
    }
  }

  const { data: kazancRaw } = await supabase.from('tanim_kazanc_bilgisi').select('*')
  const kazancMap = new Map<string, KazancPuan>()
  for (const row of kazancRaw ?? []) {
    kazancMap.set(`${row.unvan_id}-${row.ogrenim_id}-${row.derece}`, {
      ek_gosterge: row.ek_gosterge,
      ek_odeme: row.ek_odeme,
      oht: row.oht,
      yan_odeme: row.yan_odeme,
      sds_orani: row.sds_orani,
    })
  }

  const kazancLookup = (unvanId: number, ogrenimId: number, derece: number): KazancPuan | null =>
    kazancMap.get(`${unvanId}-${ogrenimId}-${derece}`) ?? null

  const tanimOgList = sortTanimOgrenimByIsim((tanimOg ?? []).map((o) => ({ id: o.id, isim: o.isim })))
  const kaynaklar: TerfiKaynak[] = []

  for (const sicil_no of memurSiciller.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))) {
    const t = terfiMap[sicil_no]
    if (!t) continue
    const k = kadroMap.get(sicil_no)
    const ogId = eslestirOgrenimId(ogrenimTuruBySicil.get(sicil_no), tanimOgList)
    const unvanId = unvanIdBySicil.get(sicil_no) ?? null
    kaynaklar.push({
      sicil_no,
      ad_soyad: t.ad_soyad ?? k?.ad_soyad ?? sicil_no,
      unvan_adi: kadroUnvaniBySicil.get(sicil_no) ?? k?.gorev_unvani ?? null,
      kadro_derecesi: kadroDerecesiBySicil.get(sicil_no) ?? null,
      ogrenim_turu: ogrenimTuruBySicil.get(sicil_no) ?? null,
      ogrenim_id: ogId,
      unvan_id: unvanId,
      kha_derece: t.kha_derece,
      kha_kademe: t.kha_kademe,
      kha_tarihi: t.kha_tarihi,
      ekea_derece: t.ekea_derece,
      ekea_kademe: t.ekea_kademe,
      ekea_tarihi: t.ekea_tarihi,
        kidem_yili: t.kidem_yili,
        kidem_tarihi: t.kidem_tarihi,
      ek_gosterge: t.ek_gosterge,
      ek_odeme: t.ek_odeme,
      oht: t.oht,
      yan_odeme: t.yan_odeme,
      sds_orani: t.sds_orani,
      terfi_id: t.id,
    })
  }

  return { kaynaklar, kazancLookup }
}
