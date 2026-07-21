import { trNormalize } from '@/lib/turkce-search'
import { auditJsonKayit } from '@/lib/personel-audit'
import { kadroSatirAktifMi, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

export interface YoneticiIletisimSatir {
  kayit_key: string
  sicil_no: string
  ad_soyad: string
  kadro_unvani: string
  telefon: string
  e_posta: string
}

type PersonelHareketSatir = Pick<
  Tables<'personel_hareketleri'>,
  'sicil_no' | 'kadro_id' | 'kadro_rol' | 'yururluk_tarihi' | 'ise_baslama_tarihi' | 'ayrilis_tarihi'
>

export type { PersonelHareketSatir }

type CalisanAudit = Pick<Tables<'personel_audit_log'>, 'created_at' | 'onceki' | 'sonraki' | 'ref_id'>

export interface YoneticiKadroSatir extends KadroRaporRow {
  id: number
  kadro_unvani: string | null
  asil: string | null
  vekil: string | null
  iptal_karar_tarihi: string | null
  iptal_karar_no: string | null
}

function sliceD(s: string | null | undefined): string | null {
  if (!s) return null
  return String(s).slice(0, 10)
}

function txt(v: string | null | undefined): string {
  const s = String(v ?? '').trim()
  return s || '—'
}

export function yoneticiUnvanOncelik(unvan: string): number | null {
  const n = trNormalize(unvan)
  if (n.includes('belediye baskani') && !n.includes('yardimci')) return 0
  if (n.includes('baskan yardimci')) return 1
  if (n.includes('mudur')) return 2
  return null
}

export function yoneticiUnvanUygun(unvan: string): boolean {
  return yoneticiUnvanOncelik(unvan) != null
}

/** `kadro:12:asil:345` veya `kadro:12:asil` */
export function parseYoneticiKayitKey(key: string): { kadroId: number; rol: 'asil' | 'vekil' } | null {
  const m = String(key ?? '').trim().match(/^kadro:(\d+):(asil|vekil)(?::\d+)?$/i)
  if (!m) return null
  return { kadroId: Number(m[1]), rol: m[2].toLowerCase() as 'asil' | 'vekil' }
}

export function yoneticiKayitKeyOlustur(kadroId: number, rol: 'asil' | 'vekil', sicil: string): string {
  return `kadro:${kadroId}:${rol}:${sicil}`
}

function kadroIptalAtD(k: Pick<YoneticiKadroSatir, 'iptal_karar_tarihi' | 'iptal_karar_no'>, D: string): boolean {
  void k.iptal_karar_no
  const t = sliceD(k.iptal_karar_tarihi)
  return Boolean(t && t <= D)
}

function hareketRol(h: PersonelHareketSatir): 'asil' | 'vekil' | null {
  const r = String(h.kadro_rol ?? '').trim().toLocaleLowerCase('tr-TR')
  if (r === 'asil') return 'asil'
  if (r === 'vekil') return 'vekil'
  return null
}

function hareketAktifAtD(h: PersonelHareketSatir, rol: 'asil' | 'vekil', D: string): boolean {
  const hRol = hareketRol(h)
  if (hRol && hRol !== rol) return false
  const bas = sliceD(h.ise_baslama_tarihi) ?? sliceD(h.yururluk_tarihi)
  if (!bas || bas > D) return false
  const bit = sliceD(h.ayrilis_tarihi)
  if (bit && bit <= D) return false
  return true
}

/** D günü sonunda kadro + rol için görev yapan sicil */
export function yoneticiSicilAtD(
  kadro: YoneticiKadroSatir,
  rol: 'asil' | 'vekil',
  D: string,
  hareketlerByKadroId: Map<number, PersonelHareketSatir[]>,
): string | null {
  if (!yoneticiUnvanUygun(String(kadro.kadro_unvani ?? ''))) return null
  if (kadroIptalAtD(kadro, D)) return null
  if (!kadroSatirAktifMi(kadro, D)) return null

  const hareketler = hareketlerByKadroId.get(kadro.id) ?? []
  let enIyi: { sicil: string; bas: string } | null = null
  for (const h of hareketler) {
    if (!hareketAktifAtD(h, rol, D)) continue
    const sicil = String(h.sicil_no ?? '').trim()
    if (!sicil) continue
    const bas = sliceD(h.ise_baslama_tarihi) ?? sliceD(h.yururluk_tarihi) ?? ''
    if (!enIyi || bas > enIyi.bas) enIyi = { sicil, bas }
  }
  if (enIyi) return enIyi.sicil

  const fallback = rol === 'asil' ? String(kadro.asil ?? '').trim() : String(kadro.vekil ?? '').trim()
  return fallback || null
}

export function iletisimAtD(
  D: string,
  current: { telefon?: string | null; e_posta?: string | null; ad_soyad?: string | null },
  audits: CalisanAudit[],
): { telefon: string; e_posta: string; ad_soyad: string } {
  let telefon = String(current.telefon ?? '').trim()
  let e_posta = String(current.e_posta ?? '').trim()
  let ad_soyad = String(current.ad_soyad ?? '').trim()

  const future = audits
    .filter(a => sliceD(a.created_at)! > D)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))

  for (const log of future) {
    const o = auditJsonKayit(log.onceki)
    const s = auditJsonKayit(log.sonraki)
    if ('telefon' in s || 'telefon' in o) telefon = String(o.telefon ?? '').trim()
    if ('e_posta' in s || 'e_posta' in o) e_posta = String(o.e_posta ?? '').trim()
    if ('ad_soyad' in s || 'ad_soyad' in o) ad_soyad = String(o.ad_soyad ?? '').trim()
  }

  return {
    telefon: txt(telefon),
    e_posta: txt(e_posta),
    ad_soyad: txt(ad_soyad),
  }
}

export function yoneticiIletisimAdaySatirlariOlustur(
  kadrolar: YoneticiKadroSatir[],
  calisanBySicil: Map<string, { ad_soyad: string; telefon: string; e_posta: string }>,
): YoneticiIletisimSatir[] {
  const out: YoneticiIletisimSatir[] = []
  for (const k of kadrolar) {
    const unvan = String(k.kadro_unvani ?? '').trim()
    if (!yoneticiUnvanUygun(unvan)) continue
    if (k.iptal_karar_tarihi || k.iptal_karar_no) continue

    for (const rol of ['asil', 'vekil'] as const) {
      const sicil = rol === 'asil' ? String(k.asil ?? '').trim() : String(k.vekil ?? '').trim()
      if (!sicil) continue
      const c = calisanBySicil.get(sicil)
      if (!c) continue
      out.push({
        kayit_key: yoneticiKayitKeyOlustur(k.id, rol, sicil),
        sicil_no: sicil,
        ad_soyad: c.ad_soyad,
        kadro_unvani: unvan || '—',
        telefon: c.telefon,
        e_posta: c.e_posta,
      })
    }
  }

  out.sort((a, b) => {
    const o1 = yoneticiUnvanOncelik(a.kadro_unvani) ?? 99
    const o2 = yoneticiUnvanOncelik(b.kadro_unvani) ?? 99
    if (o1 !== o2) return o1 - o2
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })
  return out
}

export function yoneticiIletisimListeSnapshot(input: {
  D: string
  seciliKeys: string[]
  kadroById: Map<number, YoneticiKadroSatir>
  hareketlerByKadroId: Map<number, PersonelHareketSatir[]>
  calisanBySicil: Map<string, { ad_soyad: string; telefon: string; e_posta: string }>
  auditBySicil: Map<string, CalisanAudit[]>
}): YoneticiIletisimSatir[] {
  const { D, seciliKeys, kadroById, hareketlerByKadroId, calisanBySicil, auditBySicil } = input
  const out: YoneticiIletisimSatir[] = []

  for (const key of seciliKeys) {
    const parsed = parseYoneticiKayitKey(key)
    if (!parsed) continue
    const kadro = kadroById.get(parsed.kadroId)
    if (!kadro) continue

    const sicil = yoneticiSicilAtD(kadro, parsed.rol, D, hareketlerByKadroId)
    if (!sicil) continue

    const c = calisanBySicil.get(sicil)
    const iletisim = iletisimAtD(D, c ?? {}, auditBySicil.get(sicil) ?? [])

    out.push({
      kayit_key: yoneticiKayitKeyOlustur(parsed.kadroId, parsed.rol, sicil),
      sicil_no: sicil,
      ad_soyad: iletisim.ad_soyad !== '—' ? iletisim.ad_soyad : (c?.ad_soyad ?? '—'),
      kadro_unvani: String(kadro.kadro_unvani ?? '').trim() || '—',
      telefon: iletisim.telefon,
      e_posta: iletisim.e_posta,
    })
  }

  return out
}
