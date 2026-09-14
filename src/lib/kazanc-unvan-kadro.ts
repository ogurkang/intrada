import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchAllKadroHareketleri, fetchAllPaged, fetchAllTable } from '@/lib/supabase-sayfala'
import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'
import { unvanOzelKalemMuduruMi } from '@/lib/kazanc-ozel-kalem'

export type KazancUnvanSatir = { id: number; unvan_adi: string; sinif_adi: string | null }

/** Kadro satırı statüsü `tanim_statu` ile uyumlu: yalnız Memur kadroları kazanç listesine girer. */
function kadroStatuMemurMu(statu: string | null | undefined): boolean {
  if (statu == null || !String(statu).trim()) return false
  return String(statu).trim().toLocaleLowerCase('tr-TR') === 'memur'
}

/** Sapma / detay linki kadro listesine bağlı kalmasın; aktif ünvan tanımı yeter. */
export async function fetchKazancUnvanById(
  supabase: SupabaseClient<Database>,
  unvanId: number,
): Promise<KazancUnvanSatir | null> {
  const { data } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi, sinif_adi')
    .eq('id', unvanId)
    .eq('aktif', true)
    .maybeSingle()
  return (data as KazancUnvanSatir | null) ?? null
}

/**
 * Kadro hareketlerinde: durumu Dolu/Vekil, statüsü Memur ve asil/vekil sicili `calisan`da doğrulanan
 * satırlardaki `kadro_unvan_id` / `gorev_unvan_id`. Id yoksa ada göre tek aktif `tanim_unvan` eşlemesi.
 * Ayrıca kazanç tanımı girilmiş ünvanlar ve Özel Kalem Müdürü her zaman listede durur
 * (kadro tablosu 1000+ satır; ilk sayfada kalırsa sapmadan 404 oluşuyordu).
 */
export async function fetchUnvanlarKadrodaPersonelAtanmis(
  supabase: SupabaseClient<Database>,
): Promise<KazancUnvanSatir[]> {
  const { data: kh, error } = await fetchAllKadroHareketleri<{
    kadro_unvan_id: number | null
    gorev_unvan_id: number | null
    kadro_unvani: string | null
    gorev_unvani: string | null
    asil: string | null
    vekil: string | null
    durumu: string | null
    statu: string | null
  }>(
    supabase,
    'kadro_unvan_id, gorev_unvan_id, kadro_unvani, gorev_unvani, asil, vekil, durumu, statu',
  )

  if (error) return []

  const memurSatirlari = (kh ?? []).filter(
    r => (r.durumu === 'Dolu' || r.durumu === 'Vekil') && kadroStatuMemurMu(r.statu),
  )

  const sicilAday = new Set<string>()
  for (const r of memurSatirlari) {
    const a = r.asil?.trim()
    const v = r.vekil?.trim()
    if (a) sicilAday.add(a)
    if (v) sicilAday.add(v)
  }

  const sicilList = [...sicilAday]
  const gecerliSicil = new Set<string>()
  const SICIL_CHUNK = 80
  for (let i = 0; i < sicilList.length; i += SICIL_CHUNK) {
    const chunk = sicilList.slice(i, i + SICIL_CHUNK)
    const { data: calisanlar } = await supabase.from('calisan').select('sicil_no').in('sicil_no', chunk)
    for (const c of calisanlar ?? []) gecerliSicil.add(c.sicil_no)
  }

  const { data: tumUnvan } = await fetchAllTable<{ id: number; unvan_adi: string }>(
    supabase,
    'tanim_unvan',
    'id, unvan_adi',
    { apply: q => q.eq('aktif', true) },
  )
  const adidanIdler = new Map<string, number[]>()
  for (const u of tumUnvan ?? []) {
    const k = unvanAdiNorm(u.unvan_adi)
    if (!k) continue
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
      const m = adidanIdler.get(unvanAdiNorm(r.kadro_unvani)) ?? []
      if (m.length === 1) unvanIds.add(m[0])
    }
    if (r.gorev_unvan_id != null) unvanIds.add(r.gorev_unvan_id)
    else {
      const m = adidanIdler.get(unvanAdiNorm(r.gorev_unvani)) ?? []
      if (m.length === 1) unvanIds.add(m[0])
    }
  }

  const { data: kazancUnvan } = await fetchAllPaged<{ unvan_id: number }>((from, to) =>
    supabase.from('tanim_kazanc_bilgisi').select('unvan_id').order('id').range(from, to),
  )
  for (const row of kazancUnvan ?? []) {
    if (row.unvan_id != null) unvanIds.add(row.unvan_id)
  }

  for (const u of tumUnvan ?? []) {
    if (unvanOzelKalemMuduruMi(u.unvan_adi)) unvanIds.add(u.id)
  }

  const idList = [...unvanIds]
  if (idList.length === 0) return []

  const unvanlar: KazancUnvanSatir[] = []
  const ID_CHUNK = 80
  for (let i = 0; i < idList.length; i += ID_CHUNK) {
    const chunk = idList.slice(i, i + ID_CHUNK)
    const { data } = await supabase
      .from('tanim_unvan')
      .select('id, unvan_adi, sinif_adi')
      .eq('aktif', true)
      .in('id', chunk)
    unvanlar.push(...((data ?? []) as KazancUnvanSatir[]))
  }

  unvanlar.sort((a, b) => (a.unvan_adi ?? '').localeCompare(b.unvan_adi ?? '', 'tr'))
  return unvanlar
}
