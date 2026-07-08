import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  TERFI_DONEM_AUDIT_SELECT,
  donemAuditDegerGoster,
  donemAuditDiffSatirlari,
  donemAuditSnapshot,
} from '@/lib/terfi-donem-audit'

export {
  TERFI_DONEM_AUDIT_SELECT as KESINTI_DONEM_AUDIT_SELECT,
  donemAuditSnapshot as kesintiDonemAuditSnapshot,
  donemAuditDiffSatirlari as kesintiDonemAuditDiffSatirlari,
  donemAuditDegerGoster as kesintiDonemAuditDegerGoster,
}

/** Yalnızca aylik_yemek_yeni_donem tablosunda bulunan donem_turu alanı */
export const KESINTI_AYY_DONEM_AUDIT_SELECT =
  'yil, sira_no, donem_adi, donem_turu, baslangic_tarihi, bitis_tarihi, durum'

export function kesintiDonemAuditSelect(refTable: string): string {
  return refTable === 'aylik_yemek_yeni_donem' ? KESINTI_AYY_DONEM_AUDIT_SELECT : TERFI_DONEM_AUDIT_SELECT
}

export async function writeKesintiDonemAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    refTable: string
    modul: string
    donemId: number
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    modul: input.modul,
    islem: input.islem,
    ozet: input.ozet,
    ref_table: input.refTable,
    ref_id: String(input.donemId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}

export async function fetchKesintiDonemAuditRow(
  supabase: SupabaseClient,
  refTable: string,
  id: number,
): Promise<Record<string, unknown> | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from(refTable)
    .select(kesintiDonemAuditSelect(refTable))
    .eq('id', id)
    .maybeSingle()
  return data ? donemAuditSnapshot(data as Record<string, unknown>) : null
}
