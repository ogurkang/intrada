import type { SupabaseClient } from '@supabase/supabase-js'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

export const TERFI_ALAN_ETIKETLERI: Record<string, string> = {
  ad_soyad: 'Ad Soyad',
  rol: 'Rol',
  kadro_sira_no: 'Kadro Sıra No',
  unvan: 'Ünvan',
  mudurluk: 'Müdürlük',
  gorev_ayligi_derece: 'Görev Aylığı Derece',
  gorev_ayligi_kademe: 'Görev Aylığı Kademe',
  kha_derece: 'KHA Derece',
  kha_kademe: 'KHA Kademe',
  kha_tarihi: 'KHA Tarihi',
  ekea_derece: 'EKEA Derece',
  ekea_kademe: 'EKEA Kademe',
  ekea_tarihi: 'EKEA Tarihi',
  kidem_yili: 'Kıdem Yılı',
  kidem_tarihi: 'Kıdem Tarihi',
  iyi_hal_terfi_tarihi: 'İyi Hal Terfi Tarihi',
  ek_gosterge: 'Ek Gösterge',
  ek_odeme: 'Ek Ödeme',
  oht: 'ÖHT',
  yan_odeme: 'Yan Ödeme',
  sds_orani: 'SDS Oranı',
}

export const TERFI_KATSAYI_ALAN_ETIKETLERI: Record<string, string> = Object.fromEntries(
  Object.entries(TERFI_ALAN_ETIKETLERI).filter(([k]) => !['ad_soyad', 'rol', 'kadro_sira_no', 'unvan', 'mudurluk'].includes(k)),
)

export const TERFI_AUDIT_SELECT =
  'gorev_ayligi_derece, gorev_ayligi_kademe, kha_derece, kha_kademe, kha_tarihi, ekea_derece, ekea_kademe, ekea_tarihi, kidem_yili, kidem_tarihi, iyi_hal_terfi_tarihi, ek_gosterge, ek_odeme, oht, yan_odeme, sds_orani'

export const TERFI_AUDIT_SELECT_FULL =
  `ad_soyad, rol, kadro_sira_no, unvan, mudurluk, ${TERFI_AUDIT_SELECT}`

const TARIH_ALANLARI = new Set(['kha_tarihi', 'ekea_tarihi', 'kidem_tarihi', 'iyi_hal_terfi_tarihi'])

const TERFI_TARIH_ALANLARI = ['kha_tarihi', 'ekea_tarihi', 'kidem_tarihi', 'iyi_hal_terfi_tarihi'] as const

export function terfiAuditSnapshot(
  row: Record<string, unknown>,
  alanlar: Record<string, string> = TERFI_ALAN_ETIKETLERI,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const alan of Object.keys(alanlar)) {
    let v = row[alan] ?? null
    if (v != null && (TERFI_TARIH_ALANLARI as readonly string[]).includes(alan)) {
      v = String(v).slice(0, 10) || null
    }
    out[alan] = v
  }
  return out
}

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function terfiAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  return String(deger)
}

export interface TerfiAuditDiffSatir {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

export function terfiAuditDiffSatirlari(onceki: unknown, sonraki: unknown): TerfiAuditDiffSatir[] {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: TerfiAuditDiffSatir[] = []
  for (const alan of alanlar) {
    const etiket = TERFI_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export async function logTerfiDegisiklikSafe(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    terfiId: number
    islem: string
    ozetBaslik: string
    onceki: Record<string, unknown>
    sonraki: Record<string, unknown>
    ozetEk?: string
  },
): Promise<void> {
  const degisiklikler = alanDegisiklikleriHesapla(
    input.onceki,
    input.sonraki,
    TERFI_KATSAYI_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length === 0) return
  const payload = degisiklikPayload(degisiklikler)
  const ek = input.ozetEk ? ` ${input.ozetEk}` : ''
  await writeTerfiAuditLogSafe(supabase, {
    sicil_no: input.sicil_no,
    terfiId: input.terfiId,
    islem: input.islem,
    ozet: `${degisiklikOzeti(degisiklikler, input.ozetBaslik)}${ek}`,
    onceki: payload.onceki,
    sonraki: payload.sonraki,
  })
}

export async function writeTerfiAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    terfiId: number
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.sicil_no,
    modul: 'terfi',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'terfi_hareketleri',
    ref_id: String(input.terfiId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
