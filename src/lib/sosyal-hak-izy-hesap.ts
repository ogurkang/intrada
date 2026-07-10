/**
 * Sosyal Hak IZY hesaplama yardımcıları.
 * Excel dışa aktarım ve önizleme aynı zincir / devir kurallarını paylaşır.
 */
import type { KesintimIzinRow } from './kesinym-hesap'
import {
  isIzyRhTur,
  izyRhToplamGun,
  shakChainDonemIdsUpTo,
  SHAK_IZY_DEVIR_SIRA_PREFIX,
} from './kesinym-hesap'

export type ShakDonemKayit = { id: number; baslangic_tarihi: string; bitis_tarihi: string }

export function isShakIzyDevirSatir(siraNo: string): boolean {
  return siraNo.startsWith(SHAK_IZY_DEVIR_SIRA_PREFIX)
}

/** Önceki SH dönemlerindeki IZY seçimlerinden, bu dönem listesinde olmayan sira_no'lar */
export function shakChainExtraIzySiraNolari(
  currentSiraNos: string[],
  chainSecimSiraNolari: string[],
): string[] {
  const current = new Set(currentSiraNos)
  return [...new Set(chainSecimSiraNolari.filter(sn => sn && !current.has(sn)))]
}

export function mergeRhSiciller(base: string[], extra: string[]): string[] {
  return [...new Set([...base, ...extra])]
}

export function shakChainDonemIdListesi(
  shDonemler: ShakDonemKayit[],
  shakYil: number,
  shakBitTarihi: string,
): number[] {
  return shakChainDonemIdsUpTo(shDonemler, shakYil, shakBitTarihi)
}

type RhDbRow = {
  sira_no: string | null
  sicil_no: string | null
  tur: string | null
  ayrilis: string | null
  baslama: string | null
  gun: number | null
}

/** Dönem izinleri + yıllık R/HR kayıtlarından SH zinciri için annualRh listesi */
export function buildIzyAnnualRhIzinler(
  donemIzinler: KesintimIzinRow[],
  rhRows: RhDbRow[],
  adMap: Record<string, string>,
  unvanMap: Record<string, string>,
): KesintimIzinRow[] {
  const rhBySira = new Map<string, KesintimIzinRow>()
  for (const i of donemIzinler) {
    if (isIzyRhTur(i.tur)) rhBySira.set(i.sira_no, i)
  }
  for (const row of rhRows) {
    if (!row.sira_no || !row.ayrilis || !row.baslama) continue
    rhBySira.set(row.sira_no, {
      sira_no:  row.sira_no,
      sicil_no: row.sicil_no ?? '',
      ad_soyad: adMap[row.sicil_no ?? ''] ?? row.sicil_no ?? '',
      unvan:    unvanMap[row.sicil_no ?? ''] ?? '',
      tur:      row.tur ?? '',
      ayrilis:  row.ayrilis,
      baslama:  row.baslama,
      gun:      row.gun ?? 0,
    })
  }
  return [...rhBySira.values()]
}

/** Yalnızca bu SH dönemine aktarılmış R/HR günleri (zincir kuyruğuna eklenir) */
export function buildShakCurrentDonemRhDays(
  izinler: KesintimIzinRow[],
  currentPeriodSiraNos: Set<string>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const iz of izinler) {
    if (!currentPeriodSiraNos.has(iz.sira_no)) continue
    if (!isIzyRhTur(iz.tur)) continue
    const gun = iz.gun > 0 ? iz.gun : izyRhToplamGun(iz)
    if (gun <= 0) continue
    map.set(iz.sicil_no, (map.get(iz.sicil_no) ?? 0) + gun)
  }
  return map
}
