import type { SupabaseClient } from '@supabase/supabase-js'

/** PostgREST varsayılan yanıt limiti. */
export const SUPABASE_SAYFA = 1000

type SorguSonuc<T> = { data: T[] | null; error: { message: string } | null }

// Çağrı yerlerinde select string olduğu için satır tipi çıkarılmaz; varsayılan any.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ek filtre / in / is zinciri; `order` ve `range` yardımcının işi. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SayfalaApply = (q: any) => any

/**
 * PostgREST 1000 satır sınırını aşmak için `range` ile tüm sayfaları çeker.
 * Kararlı sayfalama için sorguda `.order(...)` kullanın.
 */
export async function fetchAllPaged<T = any>(
  run: (from: number, to: number) => PromiseLike<SorguSonuc<T>>,
): Promise<{ data: T[]; error: string | null }> {
  let from = 0
  const all: T[] = []
  while (true) {
    const { data, error } = await run(from, from + SUPABASE_SAYFA - 1)
    if (error) return { data: all, error: error.message }
    if (!data?.length) break
    all.push(...data)
    if (data.length < SUPABASE_SAYFA) break
    from += SUPABASE_SAYFA
  }
  return { data: all, error: null }
}

export async function fetchAllTable<T = any>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  opts?: { apply?: SayfalaApply; orderColumn?: string },
): Promise<{ data: T[]; error: string | null }> {
  const orderColumn = opts?.orderColumn ?? 'id'
  return fetchAllPaged<T>((from, to) => {
    let q = supabase.from(table).select(select)
    if (opts?.apply) q = opts.apply(q)
    return q.order(orderColumn, { ascending: true }).range(from, to) as PromiseLike<SorguSonuc<T>>
  })
}

/** `kadro_hareketleri` tam tablo (1037+ satır) için sayfalı çekim. */
export async function fetchAllKadroHareketleri<T = any>(
  supabase: SupabaseClient,
  select: string,
  apply?: SayfalaApply,
): Promise<{ data: T[]; error: string | null }> {
  return fetchAllTable<T>(supabase, 'kadro_hareketleri', select, { apply, orderColumn: 'id' })
}

export async function fetchAllCalisan<T = any>(
  supabase: SupabaseClient,
  select: string,
  apply?: SayfalaApply,
): Promise<{ data: T[]; error: string | null }> {
  return fetchAllTable<T>(supabase, 'calisan', select, { apply, orderColumn: 'sicil_no' })
}

export async function fetchAllFirmaCalisanlar<T = any>(
  supabase: SupabaseClient,
  select: string,
  apply?: SayfalaApply,
): Promise<{ data: T[]; error: string | null }> {
  return fetchAllTable<T>(supabase, 'firma_calisanlar', select, { apply, orderColumn: 'id' })
}

export async function fetchAllPersonelHareketleri<T = any>(
  supabase: SupabaseClient,
  select: string,
  apply?: SayfalaApply,
): Promise<{ data: T[]; error: string | null }> {
  return fetchAllTable<T>(supabase, 'personel_hareketleri', select, { apply, orderColumn: 'id' })
}

export async function fetchAllCalisanOgrenim<T = any>(
  supabase: SupabaseClient,
  select: string,
  apply?: SayfalaApply,
): Promise<{ data: T[]; error: string | null }> {
  return fetchAllTable<T>(supabase, 'calisan_ogrenim', select, { apply, orderColumn: 'id' })
}
