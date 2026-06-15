import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  donemAuditDegerGoster,
  donemAuditDiffSatirlari,
  donemAuditSnapshot,
  TERFI_DONEM_AUDIT_SELECT,
} from '@/lib/terfi-donem-audit'

export {
  TERFI_DONEM_AUDIT_SELECT as EGITIM_DONEM_AUDIT_SELECT,
  donemAuditSnapshot as egitimDonemAuditSnapshot,
  donemAuditDiffSatirlari as egitimDonemAuditDiffSatirlari,
  donemAuditDegerGoster as egitimDonemAuditDegerGoster,
}

export async function writeEgitimDonemAuditLogSafe(
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
    modul: 'eğitim',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'egitim_takvimi_donem',
    ref_id: String(input.donemId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
