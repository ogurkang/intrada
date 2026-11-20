import { formatKazancPuan, parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import { unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'
import { unvanAdiNorm } from '@/lib/kazanc-yan-odeme'
import {
  parseDerece,
  yuksekDerece657,
  type KazancSatirLookup,
} from '@/lib/kazanc-teknisyen-ek-gosterge'

/**
 * 657 md. 43/b:
 * 1–4. dereceli kadroya atananlarda ek gösterge,
 * önceki kariyer sınıfı veya I sayılı cetvel GİH (g) (KHA derecesi) tabanından düşük olamaz.
 */

export type EkGosterge43bHareket = {
  sicil_no: string
  eski_unvan: string | null
  yeni_unvan: string | null
  eski_ek_gosterge: string | null
  yeni_ek_gosterge: string | null
}

export type EkGosterge43bUnvan = {
  id: number
  unvan_adi: string
  sinif_adi: string | null
}

function doluMetin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t || null
}

export function ekGostergeMax(a: string | null | undefined, b: string | null | undefined): string | null {
  const na = parseKazancPuan(a)
  const nb = parseKazancPuan(b)
  if (na == null && nb == null) return doluMetin(a) ?? doluMetin(b)
  if (na == null) return doluMetin(b)
  if (nb == null) return doluMetin(a)
  return formatKazancPuan(Math.max(na, nb))
}

export function kadroDerecesi1Ile4Mu(kadroDerecesi: string | number | null | undefined): boolean {
  const d = parseDerece(kadroDerecesi)
  return d != null && d >= 1 && d <= 4
}

function gihGUnvanMi(unvanAdi: string | null | undefined, sinifAdi: string | null | undefined): boolean {
  const sinif = unvanAdiNorm(sinifAdi)
  if (sinif && sinif !== 'GIH') return false
  const u = unvanAdiNorm(unvanAdi)
  if (!u) return false
  if (unvanMuduruMi(unvanAdi)) return false
  return u.includes('UZMAN') || u.includes('MUFETTIS') || u.includes('DENETCI') || u.includes('KONTROLOR')
}

function unvanIdBul(
  unvanAdi: string | null | undefined,
  unvanlar: EkGosterge43bUnvan[],
): number | null {
  const hedef = unvanAdiNorm(unvanAdi)
  if (!hedef) return null
  const tam = unvanlar.find(u => unvanAdiNorm(u.unvan_adi) === hedef)
  if (tam) return tam.id
  const kismi = unvanlar.find(u => {
    const a = unvanAdiNorm(u.unvan_adi)
    return a.includes(hedef) || hedef.includes(a)
  })
  return kismi?.id ?? null
}

/** Önceki müdür kariyeri + kayıtlı EG’lerden taban. */
export function oncekiMudurKariyerEgTabani(input: {
  hareketler: EkGosterge43bHareket[]
  unvanlar: EkGosterge43bUnvan[]
  lookup: KazancSatirLookup
  ogrenimId: number | null | undefined
  kadroDerecesi: string | number | null | undefined
  khaDerece: number | null | undefined
}): string | null {
  let taban: string | null = null
  const egDerece =
    yuksekDerece657(parseDerece(input.kadroDerecesi), parseDerece(input.khaDerece)) ??
    parseDerece(input.khaDerece)

  for (const h of input.hareketler) {
    for (const [unvan, kayitliEg] of [
      [h.eski_unvan, h.eski_ek_gosterge],
      [h.yeni_unvan, h.yeni_ek_gosterge],
    ] as const) {
      if (!unvanMuduruMi(unvan)) continue
      taban = ekGostergeMax(taban, kayitliEg)
      if (input.ogrenimId == null || egDerece == null) continue
      const uid = unvanIdBul(unvan, input.unvanlar)
      if (uid == null) continue
      const cetvel = doluMetin(input.lookup(uid, input.ogrenimId, egDerece)?.ek_gosterge)
      // 1. derece müdür satırı (3600) — KHA/kadro yüksek derecesi farklı olsa da kariyer tavanı
      const bir = doluMetin(input.lookup(uid, input.ogrenimId, 1)?.ek_gosterge)
      const mudurCetvel = ekGostergeMax(cetvel, bir)
      const kayitli = parseKazancPuan(kayitliEg)
      const mudurPuan = parseKazancPuan(mudurCetvel)
      /**
       * Harekette müdür unvanı yazılmış ama kayıtlı EG müdür cetvelinin altında ise
       * (ör. vekalet / yer değiştirmede 2800) cetvelden 3600’e zorlanmaz.
       * Asıl müdür kariyerinde EG boşsa veya cetvel seviyesindeyse yükseltme uygulanır.
       */
      if (kayitli != null && mudurPuan != null && kayitli < mudurPuan) continue
      taban = ekGostergeMax(taban, mudurCetvel)
    }
  }
  return taban
}

/** I sayılı cetvel GİH (g) — KHA derecesindeki uzman/müfettiş satırlarından taban. */
export function gihGEgTabani(input: {
  unvanlar: EkGosterge43bUnvan[]
  lookup: KazancSatirLookup
  ogrenimId: number | null | undefined
  khaDerece: number | null | undefined
}): string | null {
  const kha = parseDerece(input.khaDerece)
  if (kha == null || input.ogrenimId == null) return null
  let taban: string | null = null
  for (const u of input.unvanlar) {
    if (!gihGUnvanMi(u.unvan_adi, u.sinif_adi)) continue
    const eg = doluMetin(input.lookup(u.id, input.ogrenimId, kha)?.ek_gosterge)
    taban = ekGostergeMax(taban, eg)
  }
  return taban
}

export function ekGosterge43bTabaniKur(input: {
  kadroDerecesi: string | number | null | undefined
  khaDerece: number | null | undefined
  ogrenimId: number | null | undefined
  lookup: KazancSatirLookup
  unvanlar: EkGosterge43bUnvan[]
  hareketler: EkGosterge43bHareket[]
}): string | null {
  if (!kadroDerecesi1Ile4Mu(input.kadroDerecesi)) return null
  const onceki = oncekiMudurKariyerEgTabani(input)
  const gihG = gihGEgTabani(input)
  return ekGostergeMax(onceki, gihG)
}

/** Sicil → 43/b EG tabanı (kadro 1–4 + geçmiş/GİH g). */
export function ekGosterge43bTabanBySicilKur(input: {
  siciller: string[]
  kadroDerecesiBySicil: Map<string, string | null>
  khaDereceBySicil: Map<string, number | null>
  ogrenimIdBySicil: Map<string, number | null>
  hareketler: EkGosterge43bHareket[]
  unvanlar: EkGosterge43bUnvan[]
  lookup: KazancSatirLookup
}): Map<string, string | null> {
  const bySicil = new Map<string, EkGosterge43bHareket[]>()
  for (const h of input.hareketler) {
    const s = String(h.sicil_no ?? '').trim()
    if (!s) continue
    const list = bySicil.get(s)
    if (list) list.push(h)
    else bySicil.set(s, [h])
  }

  const out = new Map<string, string | null>()
  for (const sicil of input.siciller) {
    out.set(
      sicil,
      ekGosterge43bTabaniKur({
        kadroDerecesi: input.kadroDerecesiBySicil.get(sicil) ?? null,
        khaDerece: input.khaDereceBySicil.get(sicil) ?? null,
        ogrenimId: input.ogrenimIdBySicil.get(sicil) ?? null,
        lookup: input.lookup,
        unvanlar: input.unvanlar,
        hareketler: bySicil.get(sicil) ?? [],
      }),
    )
  }
  return out
}

export function ekGosterge43bUygula<T extends { ek_gosterge: string | null }>(
  puan: T,
  taban: string | null | undefined,
): T {
  const t = doluMetin(taban)
  if (!t) return puan
  const sonraki = ekGostergeMax(puan.ek_gosterge, t)
  if (sonraki == null || sonraki === doluMetin(puan.ek_gosterge)) return puan
  return { ...puan, ek_gosterge: sonraki }
}
