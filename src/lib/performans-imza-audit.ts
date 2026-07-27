import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export async function writePerformansImzaAuditLogSafe(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  input: {
    amirSicil: string
    islem: 'yukle' | 'degistir' | 'sil'
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.amirSicil,
    modul: 'PERF',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'performans_amir_imza',
    ref_id: input.amirSicil,
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}

export function performansImzaAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = typeof onceki === 'object' && onceki ? (onceki as Record<string, unknown>) : {}
  const s = typeof sonraki === 'object' && sonraki ? (sonraki as Record<string, unknown>) : {}
  const etiket: Record<string, string> = {
    dosya_adi: 'Dosya adı',
    mime_type: 'Dosya türü',
    storage_path: 'Depolama yolu',
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

export function performansImzaAuditDegerGoster(_alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}
