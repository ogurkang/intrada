import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Kadro satırı statüsü `tanim_statu` ile uyumlu: yalnız Memur kadroları kazanç listesine girer. */
function kadroStatuMemurMu(statu: string | null | undefined): boolean {
  if (statu == null || !String(statu).trim()) return false
  return String(statu).trim().toLocaleLowerCase('tr-TR') === 'memur'
}

/**
 * Kadro hareketlerinde: durumu Dolu/Vekil, statüsü Memur ve asil/vekil sicili `calisan`da doğrulanan
 * satırlardaki `kadro_unvan_id` / `gorev_unvan_id` (öncelik). Id yoksa yalnızca ada göre tek aktif
 * `tanim_unvan` eşlemesi varsa id çıkarılır; aynı ada birden fazla tanım varsa o satırdan id eklenmez.
 * Sonuç: aktif `tanim_unvan` satırları (alfabetik tr).
 */
export async function fetchUnvanlarKadrodaPersonelAtanmis(
  supabase: SupabaseClient<Database>
): Promise<{ id: number; unvan_adi: string; sinif_adi: string | null }[]> {
  const { data: kh, error } = await supabase
    .from('kadro_hareketleri')
    .select(
      'kadro_unvan_id, gorev_unvan_id, kadro_unvani, gorev_unvani, asil, vekil, durumu, statu',
    )

  if (error || !kh?.length) return []

  const memurSatirlari = kh.filter(
    (r) =>
      (r.durumu === 'Dolu' || r.durumu === 'Vekil') && kadroStatuMemurMu(r.statu),
  )

  const sicilAday = new Set<string>()
  for (const r of memurSatirlari) {
    const a = r.asil?.trim()
    const v = r.vekil?.trim()
    if (a) sicilAday.add(a)
    if (v) sicilAday.add(v)
  }

  const sicilList = [...sicilAday]
  let gecerliSicil = new Set<string>()
  if (sicilList.length > 0) {
    const { data: calisanlar } = await supabase.from('calisan').select('sicil_no').in('sicil_no', sicilList)
    gecerliSicil = new Set((calisanlar ?? []).map((c) => c.sicil_no))
  }

  const { data: tumUnvan } = await supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true)
  const adidanIdler = new Map<string, number[]>()
  for (const u of tumUnvan ?? []) {
    const k = u.unvan_adi.trim()
    if (!adidanIdler.has(k)) adidanIdler.set(k, [])
    adidanIdler.get(k)!.push(u.id)
  }

  const unvanIds = new Set<number>()
  for (const r of memurSatirlari) {
    const asilOk = !!(r.asil?.trim() && gecerliSicil.has(r.asil.trim()))
    const vekilOk = !!(r.vekil?.trim() && gecerliSicil.has(r.vekil.trim()))
    if (!asilOk && !vekilOk) continue

    if (r.kadro_unvan_id != null) unvanIds.add(r.kadro_unvan_id)
    else {
      const ku = r.kadro_unvani?.trim()
      if (ku) {
        const m = adidanIdler.get(ku) ?? []
        if (m.length === 1) unvanIds.add(m[0])
      }
    }
    if (r.gorev_unvan_id != null) unvanIds.add(r.gorev_unvan_id)
    else {
      const gu = r.gorev_unvani?.trim()
      if (gu) {
        const m = adidanIdler.get(gu) ?? []
        if (m.length === 1) unvanIds.add(m[0])
      }
    }
  }

  const idList = [...unvanIds]
  if (idList.length === 0) return []

  const { data: unvanlar } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi, sinif_adi')
    .eq('aktif', true)
    .in('id', idList)

  const list = (unvanlar ?? []) as { id: number; unvan_adi: string; sinif_adi: string | null }[]
  list.sort((a, b) => (a.unvan_adi ?? '').localeCompare(b.unvan_adi ?? '', 'tr'))
  return list
}
