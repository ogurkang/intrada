import { OGRENIM_TURU_SIRA, ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'

const ONLISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Önlisans')
const LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Lisans')
const YUKSEK_LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Yüksek Lisans')

export type KazancOgrenimAday = {
  ogrenim_turu?: string | null
  varsayilan?: boolean | null
  kayit_zamani?: string | null
  aktif?: boolean | null
}

function lisansKaydiMi(tur: string | null | undefined): boolean {
  return ogrenimTuruSiraIndex(tur) === LISANS_SIRA
}

function kazancAdaySec<T extends KazancOgrenimAday>(adaylar: T[]): T | undefined {
  if (!adaylar.length) return undefined
  return adaylar.find(r => r.aktif !== false) ?? adaylar[0]
}

export function yuksekLisansVeyaDoktoraMi(tur: string | null | undefined): boolean {
  const idx = ogrenimTuruSiraIndex(tur)
  return idx >= YUKSEK_LISANS_SIRA && idx < 9000
}

export function ogrenimLisansOnlisansGrubuMu(tur: string | null | undefined): boolean {
  const idx = ogrenimTuruSiraIndex(tur)
  return idx === ONLISANS_SIRA || idx === LISANS_SIRA
}

export function lisansOgrenimIdsBul(tanimlar: { id: number; isim: string }[]): number[] {
  return tanimlar.filter(o => lisansKaydiMi(o.isim)).map(o => o.id)
}

/**
 * YL/doktora tanımı yoksa yalnızca lisans id’leri denenir.
 * Öğrenim zaten lisans veya önlisans ise mevcut tanım paylaşımı korunur.
 */
export function kazancLookupYedekOgrenimIds(
  ogrenimId: number,
  tanimOgList: { id: number; isim: string }[],
  lisansOnlisansIds: number[],
): number[] {
  const isim = tanimOgList.find(o => o.id === ogrenimId)?.isim
  if (yuksekLisansVeyaDoktoraMi(isim)) return lisansOgrenimIdsBul(tanimOgList)
  if (lisansOnlisansIds.includes(ogrenimId)) return lisansOnlisansIds.filter(id => id !== ogrenimId)
  return []
}

/**
 * Kazanç tanımı eşlemesi: varsayılan YL/doktora olsa bile lisans kaydı kullanılır.
 * Eğitim bildirimi yeni varsayılanı işaretleyince önceki lisans satırını pasife alır;
 * kazanç için pasif lisans da geçerlidir. Önlisans yedeği yoktur.
 */
export function kazancIcinOgrenimSec<T extends KazancOgrenimAday>(rows: T[]): T | null {
  if (!rows.length) return null
  const varsayilan = rows.find(r => r.varsayilan) ?? null
  const sirali = [...rows].sort((a, b) =>
    String(b.kayit_zamani ?? '').localeCompare(String(a.kayit_zamani ?? '')),
  )
  const esas = varsayilan ?? sirali.find(r => r.aktif !== false) ?? sirali[0] ?? null
  if (!esas) return null
  if (yuksekLisansVeyaDoktoraMi(esas.ogrenim_turu)) {
    return kazancAdaySec(rows.filter(r => lisansKaydiMi(r.ogrenim_turu))) ?? esas
  }
  return esas
}

/** Tam ad veya aynı öğrenim sıra indeksi — «Lisans» «Önlisans»/«Yüksek Lisans» ile karışmaz. */
export function eslestirOgrenimId(
  ogrenimTuru: string | null | undefined,
  tanimlar: { id: number; isim: string }[],
): number | null {
  const raw = (ogrenimTuru ?? '').trim()
  if (!raw) return null
  const t = raw.toLowerCase()
  for (const o of tanimlar) {
    if (o.isim.trim().toLowerCase() === t) return o.id
  }
  const hedef = ogrenimTuruSiraIndex(raw)
  if (hedef >= 9000) return null
  const ayni = tanimlar.find(o => ogrenimTuruSiraIndex(o.isim) === hedef)
  return ayni?.id ?? null
}
