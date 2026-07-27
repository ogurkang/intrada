import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  donemAuditDegerGoster,
  donemAuditDiffSatirlari,
  donemAuditSnapshot,
} from '@/lib/terfi-donem-audit'

export const ISG_SAGLIK_DONEM_ALAN_ETIKETLERI: Record<string, string> = {
  sira_no: 'Sıra No',
  donem_adi: 'Dönem Adı',
  baslangic_tarihi: 'Başlangıç Tarihi',
  bitis_tarihi: 'Bitiş Tarihi',
}

export const ISG_SAGLIK_DONEM_AUDIT_SELECT =
  'sira_no, donem_adi, baslangic_tarihi, bitis_tarihi'

export function isgSaglikDonemAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const snap = donemAuditSnapshot(row)
  delete snap.yil
  delete snap.durum
  delete snap.donem_turu
  return snap
}

export function isgSaglikDonemAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return donemAuditDiffSatirlari(onceki, sonraki).filter(d =>
    d.alan in ISG_SAGLIK_DONEM_ALAN_ETIKETLERI,
  )
}

export const isgSaglikDonemAuditDegerGoster = donemAuditDegerGoster

export async function writeIsgSaglikDonemAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    donemId: number
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    modul: 'ISG',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'isg_saglik_taramasi_donem',
    ref_id: String(input.donemId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
