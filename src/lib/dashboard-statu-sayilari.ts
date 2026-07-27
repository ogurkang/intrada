import type { SupabaseClient } from '@supabase/supabase-js'
import { trNormalize } from '@/lib/turkce-search'

export const DASHBOARD_STATU_ETIKETLERI = [
  'Memur',
  'İşçi',
  'Sözleşmeli',
  'Meclis Üyesi',
  'Belediye Başkanı',
] as const

export type DashboardStatuEtiket = (typeof DASHBOARD_STATU_ETIKETLERI)[number]

export type DashboardKadroSatir = {
  durumu?: string | null
  asil?: string | null
  statu?: string | null
  ayrilis_tarihi?: string | null
  gorev_unvani?: string | null
  kadro_unvani?: string | null
  iptal_karar_tarihi?: string | null
  iptal_karar_no?: string | null
}

const KADRO_SAYFA = 1000

function normStatu(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function statuEtiketBul(
  statuRaw: string | null | undefined,
  gorevUnvani: string | null | undefined,
): DashboardStatuEtiket | null {
  const n = normStatu(statuRaw).toLocaleLowerCase('tr-TR')
  for (const e of DASHBOARD_STATU_ETIKETLERI) {
    if (e.toLocaleLowerCase('tr-TR') === n) return e
  }
  const unvanNorm = trNormalize(String(gorevUnvani ?? ''))
  if (unvanNorm.includes('belediye') && unvanNorm.includes('baskan') && !unvanNorm.includes('yardimci')) {
    return 'Belediye Başkanı'
  }
  return null
}

/** Kadro listesi ile uyumlu: iptal değil, asil dolu, ayrılış yok. */
export function kadroAsilAktifSatirMi(k: DashboardKadroSatir): boolean {
  if (k.iptal_karar_tarihi || k.iptal_karar_no) return false
  if (!k.asil?.trim()) return false
  if (k.ayrilis_tarihi) return false
  return true
}

/**
 * Aktif asil kadro satırlarına göre statü sayıları.
 * Kadro hareketleri ekranındaki «Asil» + statü sekmesi mantığıyla uyumludur (satır bazlı).
 */
export function dashboardStatuSayilariHesapla(
  kadro: DashboardKadroSatir[],
): Record<DashboardStatuEtiket, number> {
  const say: Record<DashboardStatuEtiket, number> = {
    Memur: 0,
    'İşçi': 0,
    Sözleşmeli: 0,
    'Meclis Üyesi': 0,
    'Belediye Başkanı': 0,
  }

  for (const r of kadro) {
    if (!kadroAsilAktifSatirMi(r)) continue
    const etiket = statuEtiketBul(r.statu, r.gorev_unvani ?? r.kadro_unvani)
    if (etiket) say[etiket] += 1
  }

  return say
}

/** Dashboard KPI: ayrılmamış tüm kadro satırları (1000 satır limitini aşmamak için sayfalı). */
export async function dashboardKadroSatirlariYukle(
  supabase: SupabaseClient,
): Promise<DashboardKadroSatir[]> {
  const out: DashboardKadroSatir[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('kadro_hareketleri')
      .select(
        'durumu, asil, statu, ayrilis_tarihi, gorev_unvani, kadro_unvani, iptal_karar_tarihi, iptal_karar_no',
      )
      .is('ayrilis_tarihi', null)
      .order('kadro_sira_no')
      .range(from, from + KADRO_SAYFA - 1)

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as DashboardKadroSatir[]
    out.push(...rows)
    if (rows.length < KADRO_SAYFA) break
    from += KADRO_SAYFA
  }

  return out
}
