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

export type IzinHareketKullanilanRaporRow = {
  id: number
  sicil_no: string | null
  tur: string | null
  ayrilis: string | null
  baslama: string | null
  gun: number | null
  durum: string | null
  yil: number | null
}

/**
 * Kullanılan izin raporu: hem `yil` kolonu hem ayrılış tarihi o yıla denk gelen
 * kayıtları (iptal hariç) 1000 satır sınırını aşarak çeker.
 */
export async function fetchAllIzinHareketleriForKullanilanRapor(
  supabase: SupabaseClient<Database>,
  yil: number,
): Promise<{ data: IzinHareketKullanilanRaporRow[]; error: string | null }> {
  const select = 'id, sicil_no, tur, ayrilis, baslama, gun, durum, yil'
  const start = `${yil}-01-01`
  const end = `${yil}-12-31`

  async function sayfalar(
    tur: 'yil' | 'ayrilis',
  ): Promise<{ data: IzinHareketKullanilanRaporRow[]; error: string | null }> {
    let from = 0
    const all: IzinHareketKullanilanRaporRow[] = []
    while (true) {
      let q = supabase
        .from('izin_hareketleri')
        .select(select)
        .neq('durum', 'İptal Edildi')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      q = tur === 'yil' ? q.eq('yil', yil) : q.gte('ayrilis', start).lte('ayrilis', end)
      const { data, error } = await q
      if (error) return { data: all, error: error.message }
      if (!data?.length) break
      all.push(...(data as IzinHareketKullanilanRaporRow[]))
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return { data: all, error: null }
  }

  const [byYil, byAyrilis] = await Promise.all([sayfalar('yil'), sayfalar('ayrilis')])
  if (byYil.error) return byYil
  if (byAyrilis.error) return byAyrilis

  const byId = new Map<number, IzinHareketKullanilanRaporRow>()
  for (const row of [...byYil.data, ...byAyrilis.data]) byId.set(row.id, row)
  return { data: [...byId.values()], error: null }
}
