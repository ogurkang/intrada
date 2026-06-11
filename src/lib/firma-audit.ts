import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export const FIRMA_ALAN_ETIKETLERI: Record<string, string> = {
  sira_no: 'Sıra No',
  sicil_no: 'Sicil No',
  ad_soyad: 'Ad Soyad',
  tckn: 'TCKN',
  cinsiyet: 'Cinsiyet',
  dogum_tarihi: 'Doğum Tarihi',
  ogrenim: 'Öğrenim',
  telefon: 'Telefon',
  e_posta: 'E-posta',
  kuruma_giris_tarihi: 'Kuruma Giriş Tarihi',
  gorev_mudurlugu: 'Görev Müdürlüğü',
  gorevi: 'Görevi',
  meslegi: 'Mesleği',
  ayrilis_tarihi: 'Ayrılış Tarihi',
  ayrilis_nedeni: 'Ayrılış Nedeni',
  yerleske_adresi_id: 'Yerleşke Adresi',
}

export const FIRMA_AUDIT_SELECT =
  'sira_no, sicil_no, ad_soyad, tckn, cinsiyet, dogum_tarihi, ogrenim, telefon, e_posta, kuruma_giris_tarihi, gorev_mudurlugu, gorevi, meslegi, ayrilis_tarihi, ayrilis_nedeni, yerleske_adresi_id'

export function firmaAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const alan of Object.keys(FIRMA_ALAN_ETIKETLERI)) {
    out[alan] = row[alan] ?? null
  }
  return out
}

const TARIH_ALANLARI = new Set(['dogum_tarihi', 'kuruma_giris_tarihi', 'ayrilis_tarihi'])

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function firmaAuditDegerGoster(
  alan: string,
  deger: unknown,
  yerleskeMap: Record<number, string>,
): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'yerleske_adresi_id') {
    const id = Number(deger)
    if (!Number.isFinite(id) || id <= 0) return '—'
    return yerleskeMap[id] ?? String(id)
  }
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  return String(deger)
}

export interface FirmaAuditDiffSatir {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

export function firmaAuditDiffSatirlari(onceki: unknown, sonraki: unknown): FirmaAuditDiffSatir[] {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: FirmaAuditDiffSatir[] = []
  for (const alan of alanlar) {
    const etiket = FIRMA_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export async function writeFirmaAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    firmaId: number
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'adabel',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'firma_calisanlar',
    ref_id: String(input.firmaId),
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
