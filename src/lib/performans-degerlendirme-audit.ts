import type { SupabaseClient } from '@supabase/supabase-js'
import { auditJsonKayit, writePersonelAuditLogSafe } from '@/lib/personel-audit'

export async function writePerformansDegAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    degerlendirmeId: number
    personelSicil: string
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.personelSicil,
    modul: 'PERF',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'performans_degerlendirme',
    ref_id: String(input.degerlendirmeId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}

export function performansDegAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = auditJsonKayit(onceki)
  const s = auditJsonKayit(sonraki)
  const etiket: Record<string, string> = {
    durum: 'Durum',
    puan_amir1: '1. amir puanı',
    puan_amir2: '2. amir puanı',
    iade_notu: 'İade notu',
  }
  const keys = new Set([...Object.keys(o), ...Object.keys(s)])
  const satirlar: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of keys) {
    const ov = o[alan]
    const sv = s[alan]
    if (JSON.stringify(ov) === JSON.stringify(sv)) continue
    satirlar.push({ alan, etiket: etiket[alan] ?? alan, onceki: ov, sonraki: sv })
  }
  return satirlar
}

export function performansDegAuditDegerGoster(_alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}
