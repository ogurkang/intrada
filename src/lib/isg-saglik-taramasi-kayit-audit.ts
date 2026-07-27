import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export type IsgSaglikKayitTur = 'tarama' | 'muayene'

export const ISG_SAGLIK_KAYIT_ALAN_ETIKETLERI: Record<string, string> = {
  tarama: 'Tarama',
  muayene: 'Muayene',
  mudurluk: 'Müdürlük',
  donem_id: 'Dönem ID',
}

export function isgSaglikKayitAuditRefId(
  sicilNo: string,
  tur: IsgSaglikKayitTur,
  donemId: number,
): string {
  return `${sicilNo}:${tur}:${donemId}`
}

export function isgSaglikKayitAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return {
    isaretlendi: row.isaretlendi ?? false,
    mudurluk: row.mudurluk ?? null,
    donem_id: row.donem_id ?? null,
    tur: row.tur ?? null,
  }
}

export function isgSaglikKayitAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'isaretlendi') return deger ? 'Evet' : 'Hayır'
  return String(deger)
}

export async function writeIsgSaglikKayitAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    donem_id: number
    tur: IsgSaglikKayitTur
    islem: string
    ozet: string
    mudurluk?: string | null
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.sicil_no,
    modul: 'ISG sağlık taraması',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'isg_saglik_taramasi_kayit',
    ref_id: isgSaglikKayitAuditRefId(input.sicil_no, input.tur, input.donem_id),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
