import { alanDegisiklikleriHesapla, writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { kysBoyutEtiket } from '@/lib/kys'
import type { SupabaseClient } from '@supabase/supabase-js'

const MENU_ETIKETLER: Record<string, string> = {
  baslik: 'Menü Adı',
  aciklama: 'Açıklama',
  sayfa_turu: 'Sayfa Türü',
}

const BASLIK_ETIKETLER: Record<string, string> = {
  baslik: 'Başlık',
  aciklama: 'Açıklama',
  sorumlu_birim: 'Sorumlu Birim',
}

const BELGE_ETIKETLER: Record<string, string> = {
  baslik: 'Başlık',
  aciklama: 'Açıklama',
  sorumlu_birim: 'Sorumlu Birim',
  dosya_adi: 'Dosya',
  mime_type: 'Tür',
  boyut_byte: 'Boyut',
}

export function kysMenuAuditSnapshot(row: Record<string, unknown>) {
  return {
    baslik: row.baslik ?? null,
    aciklama: row.aciklama ?? null,
    sayfa_turu: row.sayfa_turu ?? null,
  }
}

export function kysMenuAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki as Record<string, unknown>) ?? null,
    (sonraki as Record<string, unknown>) ?? {},
    MENU_ETIKETLER,
  )
}

export function kysMenuAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'sayfa_turu') {
    return deger === 'hub' ? 'Ana Alt Menü' : deger === 'belge' ? 'Alt Menü' : String(deger)
  }
  return String(deger)
}

export function kysBaslikAuditSnapshot(row: Record<string, unknown>) {
  return {
    baslik: row.baslik ?? null,
    aciklama: row.aciklama ?? null,
    sorumlu_birim: row.sorumlu_birim ?? null,
  }
}

export function kysBaslikAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki as Record<string, unknown>) ?? null,
    (sonraki as Record<string, unknown>) ?? {},
    BASLIK_ETIKETLER,
  )
}

export function kysBelgeAuditSnapshot(row: Record<string, unknown>) {
  return {
    baslik: row.baslik ?? null,
    sorumlu_birim: row.sorumlu_birim ?? null,
    dosya_adi: row.dosya_adi ?? null,
    mime_type: row.mime_type ?? null,
    boyut_byte: row.boyut_byte ?? null,
  }
}

export function kysBelgeAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki as Record<string, unknown>) ?? null,
    (sonraki as Record<string, unknown>) ?? {},
    BELGE_ETIKETLER,
  )
}

export function kysBelgeAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'boyut_byte') return kysBoyutEtiket(Number(deger))
  return String(deger)
}

export async function writeKysMenuAudit(
  supabase: SupabaseClient,
  opts: {
    menuId: number
    islem: string
    ozet: string
    onceki?: Record<string, unknown> | null
    sonraki?: Record<string, unknown> | null
  },
) {
  await writePersonelAuditLogSafe(supabase, {
    modul: 'KYS',
    islem: opts.islem,
    ozet: opts.ozet,
    ref_table: 'kys_menu',
    ref_id: String(opts.menuId),
    onceki: opts.onceki ?? null,
    sonraki: opts.sonraki ?? null,
  })
}

export async function writeKysBaslikAudit(
  supabase: SupabaseClient,
  opts: {
    baslikId: number
    islem: string
    ozet: string
    onceki?: Record<string, unknown> | null
    sonraki?: Record<string, unknown> | null
  },
) {
  await writePersonelAuditLogSafe(supabase, {
    modul: 'KYS',
    islem: opts.islem,
    ozet: opts.ozet,
    ref_table: 'kys_baslik',
    ref_id: String(opts.baslikId),
    onceki: opts.onceki ?? null,
    sonraki: opts.sonraki ?? null,
  })
}

export async function writeKysBelgeAudit(
  supabase: SupabaseClient,
  opts: {
    belgeId: number
    islem: string
    ozet: string
    onceki?: Record<string, unknown> | null
    sonraki?: Record<string, unknown> | null
  },
) {
  await writePersonelAuditLogSafe(supabase, {
    modul: 'KYS',
    islem: opts.islem,
    ozet: opts.ozet,
    ref_table: 'kys_belge',
    ref_id: String(opts.belgeId),
    onceki: opts.onceki ?? null,
    sonraki: opts.sonraki ?? null,
  })
}
