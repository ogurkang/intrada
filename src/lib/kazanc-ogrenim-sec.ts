import { OGRENIM_TURU_SIRA, ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'

const ONLISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Önlisans')
const LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Lisans')
const YUKSEK_LISANS_SIRA = OGRENIM_TURU_SIRA.indexOf('Yüksek Lisans')

export type KazancOgrenimAday = {
  ogrenim_turu?: string | null
  varsayilan?: boolean | null
  kayit_zamani?: string | null
}

function lisansKaydiMi(tur: string | null | undefined): boolean {
  return ogrenimTuruSiraIndex(tur) === LISANS_SIRA
}

function yuksekLisansVeyaDoktoraMi(tur: string | null | undefined): boolean {
  const idx = ogrenimTuruSiraIndex(tur)
  return idx >= YUKSEK_LISANS_SIRA && idx < 9000
}

export function ogrenimLisansOnlisansGrubuMu(tur: string | null | undefined): boolean {
  const idx = ogrenimTuruSiraIndex(tur)
  return idx === ONLISANS_SIRA || idx === LISANS_SIRA
}

/**
 * Kazanç tanımı eşlemesi: varsayılan YL/doktora olsa bile lisans kaydı varsa lisans kullanılır.
 * Varsayılan yoksa en yeni aktif kayıt esas alınır, lisans kuralı yine uygulanır.
 */
export function kazancIcinOgrenimSec<T extends KazancOgrenimAday>(rows: T[]): T | null {
  if (!rows.length) return null
  const varsayilan = rows.find(r => r.varsayilan) ?? null
  const sirali = [...rows].sort((a, b) =>
    String(b.kayit_zamani ?? '').localeCompare(String(a.kayit_zamani ?? '')),
  )
  const esas = varsayilan ?? sirali[0] ?? null
  if (!esas) return null
  if (yuksekLisansVeyaDoktoraMi(esas.ogrenim_turu)) {
    const lisans = rows.find(r => lisansKaydiMi(r.ogrenim_turu))
    if (lisans) return lisans
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
