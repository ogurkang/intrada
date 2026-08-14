import { alanDegisiklikleriHesapla, writePersonelAuditLogSafe } from '@/lib/personel-audit'
import type { SupabaseClient } from '@supabase/supabase-js'

const ETIKETLER: Record<string, string> = {
  sira_no: 'Sıra No',
  donem_adi: 'Dönem Adı',
  baslangic_tarihi: 'Başlangıç',
  bitis_tarihi: 'Bitiş',
  durum: 'Durum',
}

const KARAR_ETIKETLER: Record<string, string> = {
  karar_turu: 'Karar Türü',
  ay: 'Ay',
  sorumlu_birim: 'Sorumlu Birim',
  dosya_adi: 'Dosya',
  mime_type: 'Tür',
  boyut_byte: 'Boyut',
}

export function denetimDonemAuditSnapshot(row: Record<string, unknown>) {
  return {
    sira_no: row.sira_no ?? null,
    donem_adi: row.donem_adi ?? null,
    baslangic_tarihi: row.baslangic_tarihi ?? null,
    bitis_tarihi: row.bitis_tarihi ?? null,
    durum: row.durum ?? null,
  }
}

export function denetimDonemAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki as Record<string, unknown>) ?? null,
    (sonraki as Record<string, unknown>) ?? {},
    ETIKETLER,
  )
}

export function denetimDonemAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'baslangic_tarihi' || alan === 'bitis_tarihi') {
    try {
      return new Date(String(deger)).toLocaleDateString('tr-TR')
    } catch {
      return String(deger)
    }
  }
  return String(deger)
}

export function denetimKararAuditSnapshot(row: Record<string, unknown>) {
  return {
    karar_turu: row.karar_turu ?? null,
    ay: row.ay ?? null,
    sorumlu_birim: row.sorumlu_birim ?? null,
    dosya_adi: row.dosya_adi ?? null,
    mime_type: row.mime_type ?? null,
    boyut_byte: row.boyut_byte ?? null,
  }
}

export function denetimKararAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  return alanDegisiklikleriHesapla(
    (onceki as Record<string, unknown>) ?? null,
    (sonraki as Record<string, unknown>) ?? {},
    KARAR_ETIKETLER,
  )
}

export function denetimKararAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'karar_turu') {
    return deger === 'meclis' ? 'Meclis' : deger === 'encumen' ? 'Encümen' : String(deger)
  }
  if (alan === 'ay') {
    const n = Number(deger)
    const aylar = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    return aylar[n] ?? String(deger)
  }
  if (alan === 'boyut_byte') {
    const b = Number(deger)
    if (!Number.isFinite(b) || b <= 0) return '—'
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }
  return String(deger)
}

export async function writeDenetimDonemAudit(
  supabase: SupabaseClient,
  opts: {
    donemId: number
    islem: string
    ozet: string
    onceki?: Record<string, unknown> | null
    sonraki?: Record<string, unknown> | null
  },
) {
  await writePersonelAuditLogSafe(supabase, {
    modul: 'DENETIM',
    islem: opts.islem,
    ozet: opts.ozet,
    ref_table: 'denetim_donem',
    ref_id: String(opts.donemId),
    onceki: opts.onceki ?? null,
    sonraki: opts.sonraki ?? null,
  })
}

export async function writeDenetimKararAudit(
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
    modul: 'DENETIM',
    islem: opts.islem,
    ozet: opts.ozet,
    ref_table: 'denetim_karar_belge',
    ref_id: String(opts.belgeId),
    onceki: opts.onceki ?? null,
    sonraki: opts.sonraki ?? null,
  })
}
