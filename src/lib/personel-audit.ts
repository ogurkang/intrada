import type { SupabaseClient } from '@supabase/supabase-js'

/** Audit log onceki/sonraki JSON alanlarını güvenli nesneye çevirir. */
export function auditJsonKayit(v: unknown): Record<string, unknown> {
  if (v == null) return {}
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return {}
    try {
      const parsed = JSON.parse(t) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
    return {}
  }
  if (typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}

export interface PersonelAuditWriteInput {
  sicil_no?: string | null
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
    sicil_no: input.sicil_no ?? null,
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

export interface AlanDegisiklik {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

function normalize(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Eski ve yeni kayıt arasındaki alan bazlı farkları çıkarır.
 * Yalnızca `etiketler` içinde tanımlı alanlar karşılaştırılır.
 */
export function alanDegisiklikleriHesapla(
  onceki: Record<string, unknown> | null | undefined,
  sonraki: Record<string, unknown>,
  etiketler: Record<string, string>,
): AlanDegisiklik[] {
  const out: AlanDegisiklik[] = []
  for (const [alan, etiket] of Object.entries(etiketler)) {
    if (!(alan in sonraki)) continue
    const eski = onceki?.[alan]
    const yeni = sonraki[alan]
    if (normalize(eski) === normalize(yeni)) continue
    out.push({ alan, etiket, onceki: eski ?? null, sonraki: yeni ?? null })
  }
  return out
}

export function degisiklikOzeti(degisiklikler: AlanDegisiklik[], baslik: string): string {
  const etiketler = degisiklikler.map(d => d.etiket).join(', ')
  return `${baslik}: ${etiketler}`
}

export function degisiklikPayload(
  degisiklikler: AlanDegisiklik[],
): { onceki: Record<string, unknown>; sonraki: Record<string, unknown> } {
  const onceki: Record<string, unknown> = {}
  const sonraki: Record<string, unknown> = {}
  for (const d of degisiklikler) {
    onceki[d.alan] = d.onceki
    sonraki[d.alan] = d.sonraki
  }
  return { onceki, sonraki }
}
