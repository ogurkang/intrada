import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export const EGITIM_KATILIM_ALAN_ETIKETLERI: Record<string, string> = {
  katildi: 'Katılım',
  mudurluk: 'Müdürlük',
  egitim_id: 'Eğitim ID',
  donem_id: 'Dönem ID',
}

export function katilimAuditRefId(sicilNo: string, egitimId: number): string {
  return `${sicilNo}:${egitimId}`
}

export function katilimAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return {
    katildi: row.katildi ?? true,
    mudurluk: row.mudurluk ?? null,
    egitim_id: row.egitim_id ?? null,
    donem_id: row.donem_id ?? null,
  }
}

export function katilimAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'katildi') return deger ? 'Evet' : 'Hayır'
  return String(deger)
}

export function katilimAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = katilimAuditSnapshot((onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>)
  const s = katilimAuditSnapshot((sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = EGITIM_KATILIM_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => {
      if (typeof v === 'boolean') return v ? '1' : '0'
      return v == null ? '' : String(v).trim()
    }
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export async function writeEgitimKatilimAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    egitim_id: number
    donem_id: number
    islem: string
    ozet: string
    mudurluk?: string | null
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.sicil_no,
    modul: 'eğitim katılım',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'egitim_istatistik_katilim',
    ref_id: katilimAuditRefId(input.sicil_no, input.egitim_id),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
