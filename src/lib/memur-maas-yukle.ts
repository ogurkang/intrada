import { createClient } from '@/lib/supabase/server'
import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { aktifMudurlukleriGetir } from '@/lib/yerel-bilgi-butce-mudurluk'
import type { MemurMaasOdenek } from '@/lib/memur-maas-hesap'

export type MemurMaasYukleSonuc = {
  odenekler: MemurMaasOdenek[]
  mudurlukler: string[]
  /** müdürlük adı → unvan listesi (kadro_mudurlugu eşleşmesi, Memur) */
  unvanByMudurluk: Record<string, string[]>
}

export async function yukleMemurMaasKaynaklari(): Promise<MemurMaasYukleSonuc> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: butceRaw }, mudurlukSecenek, { data: kadroRaw }] = await Promise.all([
    sb
      .from('performans_programi_butce_kodu')
      .select('id, adim_1, adim_2, adim_3, adim_4, ekonomik_kod, hesap_adi')
      .eq('aktif', true)
      .in('adim_1', ['01', '02'])
      .order('ekonomik_kod'),
    aktifMudurlukleriGetir(supabase),
    fetchAllKadroHareketleri<{
      kadro_unvani: string | null
      kadro_mudurlugu: string | null
      ayrilis_tarihi: string | null
      statu: string | null
    }>(supabase, 'kadro_unvani, kadro_mudurlugu, ayrilis_tarihi, statu', q =>
      q.is('ayrilis_tarihi', null).eq('statu', 'Memur'),
    ),
  ])

  type ButceSatir = {
    id: number
    adim_1: string
    adim_2: string
    adim_3: string
    adim_4: string
    ekonomik_kod: string
    hesap_adi: string
  }
  const odenekler: MemurMaasOdenek[] = ((butceRaw ?? []) as ButceSatir[])
    .filter(r => String(r.adim_4 ?? '').trim() !== '')
    .map(r => ({
      id: r.id,
      ekonomik_kod: r.ekonomik_kod,
      hesap_adi: r.hesap_adi,
      adim_1: r.adim_1,
      adim_2: r.adim_2,
      adim_3: r.adim_3,
      adim_4: r.adim_4,
    }))

  const mudurlukler = mudurlukSecenek.map(m => m.mudurluk_adi.trim()).filter(Boolean)

  const unvanSetByMud = new Map<string, Set<string>>()
  for (const k of kadroRaw ?? []) {
    const mud = String(k.kadro_mudurlugu ?? '').trim()
    const unvan = String(k.kadro_unvani ?? '').trim()
    if (!mud || !unvan) continue
    let set = unvanSetByMud.get(mud)
    if (!set) {
      set = new Set()
      unvanSetByMud.set(mud, set)
    }
    set.add(unvan)
  }

  const unvanByMudurluk: Record<string, string[]> = {}
  for (const mud of mudurlukler) {
    const set = unvanSetByMud.get(mud)
    unvanByMudurluk[mud] = set
      ? [...set].sort((a, b) => a.localeCompare(b, 'tr'))
      : []
  }
  // Kadroda olup tanim_mudurluk'te olmayanlar
  for (const [mud, set] of unvanSetByMud) {
    if (unvanByMudurluk[mud]) continue
    unvanByMudurluk[mud] = [...set].sort((a, b) => a.localeCompare(b, 'tr'))
    mudurlukler.push(mud)
  }
  mudurlukler.sort((a, b) => a.localeCompare(b, 'tr'))

  return { odenekler, mudurlukler, unvanByMudurluk }
}
