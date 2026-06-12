import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const PAGE_SIZE = 1000

export type FetchIzinHareketleriByYilOptions = {
  select?: string
  /** Sayfalama için sabit sıra (varsayılan: id artan) */
  orderColumn?: string
  orderAscending?: boolean
}

/**
 * PostgREST varsayılan 1000 satır sınırını aşmak için yıla göre sayfalı izin hareketi çekimi.
 */
export async function fetchAllIzinHareketleriByYil<TRow = unknown>(
  supabase: SupabaseClient<Database>,
  yil: number,
  options: FetchIzinHareketleriByYilOptions = {},
): Promise<{ data: TRow[]; error: string | null }> {
  const select = options.select ?? '*'
  const orderColumn = options.orderColumn ?? 'id'
  const orderAscending = options.orderAscending ?? true

  let from = 0
  const all: TRow[] = []

  while (true) {
    const { data, error } = await supabase
      .from('izin_hareketleri')
      .select(select)
      .eq('yil', yil)
      .order(orderColumn, { ascending: orderAscending })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { data: all, error: error.message }
    if (!data?.length) break

    all.push(...(data as TRow[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return { data: all, error: null }
}
