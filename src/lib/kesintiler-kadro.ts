import type { SupabaseClient } from '@supabase/supabase-js'

/** Raporlu Memurlar, İzinli Vekiller, İzinli Zabıtalar ve Sosyal Hak için ortak kadro kuralları */

export const ZABITA_MUDURLUGU = 'Zabıta Müdürlüğü'

export const RMY_IZIN_TURLERI = ['Rapor', 'Refakatçi Raporu', 'Refakatçi İzni'] as const

/** IZY izin türü filtresi (PostgREST .or ifadesi) */
export const IZY_IZIN_TURLERI_OR =
  'tur.ilike.%Yıllık%,tur.ilike.%Ölüm%,tur.ilike.%Evlilik%,tur.ilike.%Babalık%,tur.ilike.%Mehil%,tur.ilike.%Mazeret%,tur.ilike.%İdari%,tur.ilike.%Doğum Öncesi%,tur.ilike.%Doğum Sonrası%,tur.ilike.%Refakatçi%,tur.eq.Rapor,tur.eq.Heyet Raporu'

type KadroVekilRow = {
  asil: string | null
  vekil: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
}

type KadroZabitaRow = {
  asil: string | null
  vekil: string | null
  kadro_mudurlugu: string | null
}

/** PostgREST varsayılan 1000 satır sınırını aşmak için sayfalı kadro çekimi */
async function fetchAllActiveKadro<T>(
  supabase: SupabaseClient,
  select: string,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const all: T[] = []
  while (true) {
    const { data } = await supabase
      .from('kadro_hareketleri')
      .select(select)
      .is('ayrilis_tarihi', null)
      .range(from, from + pageSize - 1)
    if (!data?.length) break
    all.push(...(data as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

/**
 * RMY: Statüsü Memur, ayrılış tarihi boş olan personel.
 * (/kesintiler/rmy ile aynı)
 */
export async function buildMemurSiciller(supabase: SupabaseClient): Promise<Set<string>> {
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil')
    .is('ayrilis_tarihi', null)
    .eq('statu', 'Memur')

  const memurSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) memurSiciller.add(sicil)
  }
  return memurSiciller
}

/**
 * IVY: Kadroda vekil olarak yer alan personel; asıl ünvanında "müdürü" geçenler hariç.
 * (/kesintiler/ivy ile aynı — tüm aktif kadro taranır)
 */
export async function buildVekilSiciller(supabase: SupabaseClient): Promise<Set<string>> {
  const kadroRaw = await fetchAllActiveKadro<KadroVekilRow>(
    supabase,
    'asil, vekil, kadro_unvani, gorev_unvani',
  )

  const vekilSiciller = new Set<string>()
  const asilMuduruSiciller = new Set<string>()

  for (const k of kadroRaw) {
    const vekilSicil = (k.vekil ?? '').trim()
    if (vekilSicil) vekilSiciller.add(vekilSicil)
    const asil = (k.asil ?? '').trim()
    if (!asil) continue
    const unvan = `${String(k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')} ${String(k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')}`
    if (unvan.includes('müdürü')) asilMuduruSiciller.add(asil)
  }
  for (const sicil of asilMuduruSiciller) {
    vekilSiciller.delete(sicil)
  }
  return vekilSiciller
}

/**
 * IZY: Kadro müdürlüğü Zabıta Müdürlüğü olan personel.
 * (/kesintiler/izy ile aynı — tüm aktif kadro taranır)
 */
export async function buildZabitaSiciller(supabase: SupabaseClient): Promise<Set<string>> {
  const kadroRaw = await fetchAllActiveKadro<KadroZabitaRow>(
    supabase,
    'asil, vekil, kadro_mudurlugu',
  )

  const zabitaSiciller = new Set<string>()
  for (const k of kadroRaw) {
    const mud = (k.kadro_mudurlugu ?? '').trim()
    if (mud !== ZABITA_MUDURLUGU) continue
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) zabitaSiciller.add(sicil)
  }
  return zabitaSiciller
}
