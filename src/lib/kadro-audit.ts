import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export const KADRO_ALAN_ETIKETLERI: Record<string, string> = {
  meclis_karar_tarihi: 'Meclis Karar Tarihi',
  meclis_karar_no: 'Meclis Karar No',
  iptal_karar_tarihi: 'İptal Karar Tarihi',
  iptal_karar_no: 'İptal Karar No',
  kadro_sira_no: 'Kadro Sıra No',
  kadro_derecesi: 'Kadro Derecesi',
  statu: 'Statü',
  ayrim: 'Ayrım',
  kadro_unvani: 'Kadro Ünvanı',
  kadro_mudurlugu: 'Kadro Müdürlüğü',
  gorev_unvani: 'Görev Ünvanı',
  gorev_mudurlugu: 'Görev Müdürlüğü',
  asil: 'Asil',
  vekil: 'Vekil',
  durumu: 'Durum',
  gelis_nedeni: 'Geliş Nedeni',
  geldigi_yer: 'Geldiği Yer',
  ayrilis_tarihi: 'Ayrılış Tarihi',
  ayrilis_nedeni: 'Ayrılış Nedeni',
  gittigi_yer: 'Gittiği Yer',
  aciklama: 'Açıklama',
}

export const KADRO_AUDIT_SELECT =
  'meclis_karar_tarihi, meclis_karar_no, iptal_karar_tarihi, iptal_karar_no, kadro_sira_no, kadro_derecesi, statu, ayrim, kadro_unvani, kadro_mudurlugu, gorev_unvani, gorev_mudurlugu, asil, vekil, durumu, gelis_nedeni, geldigi_yer, ayrilis_tarihi, ayrilis_nedeni, gittigi_yer, aciklama'

export function kadroAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const alan of Object.keys(KADRO_ALAN_ETIKETLERI)) {
    out[alan] = (row as Record<string, unknown>)[alan] ?? null
  }
  return out
}

export function kadroAuditSicilNo(asil: string | null | undefined, vekil: string | null | undefined): string | null {
  const a = String(asil ?? '').trim()
  if (a) return a
  const v = String(vekil ?? '').trim()
  return v || null
}

const TARIH_ALANLARI = new Set(['meclis_karar_tarihi', 'iptal_karar_tarihi', 'ayrilis_tarihi'])
const PERSONEL_ALANLARI = new Set(['asil', 'vekil'])

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

function personelGoster(v: unknown, adMap: Record<string, string>): string {
  if (v == null || v === '') return '—'
  const sicil = String(v).trim()
  const ad = adMap[sicil]
  return ad ? `${ad} (${sicil})` : sicil
}

export function kadroAuditDegerGoster(
  alan: string,
  deger: unknown,
  adMap: Record<string, string>,
): string {
  if (deger == null || deger === '') return '—'
  if (PERSONEL_ALANLARI.has(alan)) return personelGoster(deger, adMap)
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  return String(deger)
}

export interface KadroBosaltmaAuditKayit {
  kadroId: number
  onceki: Record<string, unknown>
  sonraki: Record<string, unknown>
}

function trTarih(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('tr-TR')
}

export async function writeKadroBosaltmaAuditLoglari(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    ayrilis_nedeni: string
    ayrilis_tarihi: string
    kayitlar: KadroBosaltmaAuditKayit[]
  },
): Promise<void> {
  const ozet = `Ayrılış nedeniyle kadrodan çıkarıldı (${input.ayrilis_nedeni}, ${trTarih(input.ayrilis_tarihi)}).`
  for (const k of input.kayitlar) {
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: input.sicil_no,
      modul: 'kadro',
      islem: 'Kadro Boşaltma',
      ozet,
      ref_table: 'kadro_hareketleri',
      ref_id: String(k.kadroId),
      onceki: k.onceki,
      sonraki: k.sonraki,
    })
  }
}

export interface KadroAuditDiffSatir {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

/** onceki/sonraki jsonb payload'ından alan bazlı diff tablosu üretir. */
export function kadroAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): KadroAuditDiffSatir[] {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: KadroAuditDiffSatir[] = []
  for (const alan of alanlar) {
    const etiket = KADRO_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}
