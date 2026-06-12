import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { terfiAuditDiffSatirlari, terfiAuditDegerGoster } from '@/lib/terfi-audit'

export const TERFI_DONEM_ALAN_ETIKETLERI: Record<string, string> = {
  yil: 'Yıl',
  sira_no: 'Sıra No',
  donem_adi: 'Dönem Adı',
  baslangic_tarihi: 'Başlangıç Tarihi',
  bitis_tarihi: 'Bitiş Tarihi',
  durum: 'Durum',
}

export const TERFI_DONEM_AUDIT_SELECT =
  'yil, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi, durum'

const TARIH_ALANLARI = new Set(['baslangic_tarihi', 'bitis_tarihi'])

export function donemAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const alan of Object.keys(TERFI_DONEM_ALAN_ETIKETLERI)) {
    let v = row[alan] ?? null
    if (v != null && TARIH_ALANLARI.has(alan)) v = String(v).slice(0, 10) || null
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

export function donemAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  return String(deger)
}

export interface DonemAuditDiffSatir {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

export function donemAuditDiffSatirlari(onceki: unknown, sonraki: unknown): DonemAuditDiffSatir[] {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: DonemAuditDiffSatir[] = []
  for (const alan of alanlar) {
    const etiketDonem = TERFI_DONEM_ALAN_ETIKETLERI[alan]
    if (!etiketDonem) continue
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket: etiketDonem, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

/** Dönem metadata + terfi katsayı alanlarını birleşik diff tablosu. */
export function terfiDonemAuditDiffSatirlari(onceki: unknown, sonraki: unknown): DonemAuditDiffSatir[] {
  const birlesik = new Map<string, DonemAuditDiffSatir>()
  for (const d of donemAuditDiffSatirlari(onceki, sonraki)) birlesik.set(d.alan, d)
  for (const d of terfiAuditDiffSatirlari(onceki, sonraki)) birlesik.set(d.alan, d)
  return [...birlesik.values()].sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export function terfiDonemAuditDegerGoster(alan: string, deger: unknown): string {
  if (alan in TERFI_DONEM_ALAN_ETIKETLERI) return donemAuditDegerGoster(alan, deger)
  return terfiAuditDegerGoster(alan, deger)
}

export async function writeTerfiDonemAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    donemId: number
    islem: string
    ozet: string
    sicil_no?: string | null
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.sicil_no ?? null,
    modul: 'terfi',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'terfi_donem',
    ref_id: String(input.donemId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
