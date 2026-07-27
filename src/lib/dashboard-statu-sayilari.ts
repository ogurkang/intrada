import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { trNormalize } from '@/lib/turkce-search'

export const DASHBOARD_STATU_ETIKETLERI = [
  'Memur',
  'İşçi',
  'Sözleşmeli',
  'Meclis Üyesi',
  'Belediye Başkanı',
] as const

export type DashboardStatuEtiket = (typeof DASHBOARD_STATU_ETIKETLERI)[number]

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

/** Asil kadro satırına göre (rapor snapshot ile aynı mantık) aktif personel statü sayıları. */
export function dashboardStatuSayilariHesapla(
  kadro: KadroRaporRow[],
  D: string,
): Record<DashboardStatuEtiket, number> {
  const say: Record<DashboardStatuEtiket, number> = {
    Memur: 0,
    'İşçi': 0,
    Sözleşmeli: 0,
    'Meclis Üyesi': 0,
    'Belediye Başkanı': 0,
  }

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    const sicil = r.asil?.trim()
    if (!sicil) continue
    const list = byAsil.get(sicil) ?? []
    list.push(r)
    byAsil.set(sicil, list)
  }

  for (const [, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const etiket = statuEtiketBul(secilen.statu, secilen.gorev_unvani ?? secilen.kadro_unvani)
    if (etiket) say[etiket] += 1
  }

  return say
}
