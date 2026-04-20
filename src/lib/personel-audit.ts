import type { SupabaseClient } from '@supabase/supabase-js'

export interface PersonelAuditWriteInput {
  sicil_no: string
  modul: string
  islem: string
  ozet: string
  ref_table?: string | null
  ref_id?: string | null
  onceki?: unknown | null
  sonraki?: unknown | null
}

async function resolveActor(supabase: SupabaseClient): Promise<{ actor_id: string | null; actor_email: string | null }> {
  const { data } = await supabase.auth.getUser()
  const user = data.user
  return {
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
  }
}

export async function writePersonelAuditLog(
  supabase: SupabaseClient,
  input: PersonelAuditWriteInput,
): Promise<void> {
  const actor = await resolveActor(supabase)
  const { error } = await supabase.from('personel_audit_log').insert({
    sicil_no: input.sicil_no,
    modul: input.modul,
    islem: input.islem,
    ozet: input.ozet,
    actor_id: actor.actor_id,
    actor_email: actor.actor_email,
    ref_table: input.ref_table ?? null,
    ref_id: input.ref_id ?? null,
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function writePersonelAuditLogSafe(
  supabase: SupabaseClient,
  input: PersonelAuditWriteInput,
): Promise<void> {
  try {
    await writePersonelAuditLog(supabase, input)
  } catch (err) {
    console.error('PERSONEL_AUDIT_WRITE_FAILED', err)
  }
}
