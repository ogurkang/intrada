import { kazancTaniminiKuralla, type KazancKuralOpts } from '@/lib/kazanc-kural-uygula'
import { unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'
import { formatKazancPuan, parseKazancPuan } from '@/lib/kazanc-tasinir-yetkili'
import type { KazancSatirLookup } from '@/lib/kazanc-teknisyen-ek-gosterge'
import { parseDerece } from '@/lib/kazanc-teknisyen-ek-gosterge'

type KazancPuan = {
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  yan_odeme_eksi5: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani: string | null
}

function kazancSatirToPuan(row: {
  ek_gosterge: string | null
  ek_odeme?: string | null
  oht?: string | null
  yan_odeme?: string | null
  yan_odeme_eksi5?: string | null
  sds_orani?: string | null
}): KazancPuan {
  return {
    ek_gosterge: row.ek_gosterge ?? null,
    ek_odeme: row.ek_odeme ?? null,
    oht: row.oht ?? null,
    yan_odeme: row.yan_odeme ?? null,
    yan_odeme_eksi5: row.yan_odeme_eksi5 ?? null,
    sds_orani: row.sds_orani ?? null,
  }
}

export const KAZANC_OK_ISARETI = '→'

export const KAZANC_FARK_ALANLARI = [
  'ek_gosterge',
  'ek_odeme',
  'oht',
  'yan_odeme',
  'sds_orani',
] as const

export type KazancFarkAlan = (typeof KAZANC_FARK_ALANLARI)[number]

export function vekilMudurUnvaniMi(unvanAdi: string | null | undefined): boolean {
  return unvanMuduruMi(unvanAdi)
}

/** Kadro durumu vekil ve unvanında «müdürü» geçen kayıt. */
export function vekilMudurFarkKapsamiMi(
  rol: string | null | undefined,
  unvanAdi: string | null | undefined,
): boolean {
  const r = String(rol ?? '').trim().toLowerCase()
  return r === 'vekil' && vekilMudurUnvaniMi(unvanAdi)
}

export function kazancOkMetni(eski: string | null | undefined, yeni: string | null | undefined): string {
  const e = String(eski ?? '').trim() || '—'
  const y = String(yeni ?? '').trim() || '—'
  return `${e} ${KAZANC_OK_ISARETI} ${y}`
}

function farkAlan(mudur: string | null | undefined, kendi: string | null | undefined): string | null {
  const m = parseKazancPuan(mudur)
  const k = parseKazancPuan(kendi)
  if (m == null && k == null) return null
  return formatKazancPuan(Math.max(0, (m ?? 0) - (k ?? 0)))
}

/** Asil müdür kazancı − kendi asil unvan kazancı; negatif kalem 0. */
export function kazancVekilMudurFarki(mudur: KazancPuan, kendi: KazancPuan): KazancPuan {
  return {
    ek_gosterge: farkAlan(mudur.ek_gosterge, kendi.ek_gosterge),
    ek_odeme: farkAlan(mudur.ek_odeme, kendi.ek_odeme),
    oht: farkAlan(mudur.oht, kendi.oht),
    yan_odeme: farkAlan(mudur.yan_odeme, kendi.yan_odeme),
    yan_odeme_eksi5: farkAlan(mudur.yan_odeme_eksi5, kendi.yan_odeme_eksi5),
    yan_odeme_bilgisayarsiz: farkAlan(mudur.yan_odeme_bilgisayarsiz, kendi.yan_odeme_bilgisayarsiz),
    sds_orani: farkAlan(mudur.sds_orani, kendi.sds_orani),
  }
}

export function kazancPuanEsit(a: KazancPuan, b: KazancPuan): boolean {
  for (const key of KAZANC_FARK_ALANLARI) {
    const na = parseKazancPuan(a[key])
    const nb = parseKazancPuan(b[key])
    if (na == null && nb == null) {
      if (String(a[key] ?? '').trim() !== String(b[key] ?? '').trim()) return false
      continue
    }
    if (na !== nb) return false
  }
  return true
}

function tanimKuralla(
  lookup: KazancSatirLookup,
  opts: KazancKuralOpts,
  khaDerece: number,
): KazancPuan | null {
  const unvanId = opts.unvanId
  const ogrenimId = opts.ogrenimId
  if (unvanId == null || ogrenimId == null) return null
  const ham = lookup(unvanId, ogrenimId, khaDerece)
  if (!ham) return null
  const kuralli = kazancTaniminiKuralla(ham, lookup, opts)
  return kazancSatirToPuan({
    ek_gosterge: kuralli.ek_gosterge ?? null,
    ek_odeme: kuralli.ek_odeme ?? null,
    oht: kuralli.oht ?? null,
    yan_odeme: kuralli.yan_odeme ?? null,
    yan_odeme_eksi5: kuralli.yan_odeme_eksi5 ?? null,
    sds_orani: kuralli.sds_orani ?? null,
  })
}

export function vekilMudurFarkHesapla(input: {
  lookup: KazancSatirLookup
  khaDerece: number | string | null | undefined
  kendiOpts: KazancKuralOpts
  mudurOpts: KazancKuralOpts
}): { kendi: KazancPuan; mudur: KazancPuan; fark: KazancPuan } | null {
  const kha = parseDerece(input.khaDerece)
  if (kha == null) return null
  if (!vekilMudurUnvaniMi(input.mudurOpts.unvanAdi)) return null
  const kendi = tanimKuralla(input.lookup, { ...input.kendiOpts, asilMi: true, khaDerece: kha }, kha)
  const mudur = tanimKuralla(input.lookup, { ...input.mudurOpts, asilMi: true, khaDerece: kha }, kha)
  if (!kendi || !mudur) return null
  return { kendi, mudur, fark: kazancVekilMudurFarki(mudur, kendi) }
}
