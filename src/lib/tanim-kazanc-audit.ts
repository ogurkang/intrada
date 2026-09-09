import { auditJsonKayit } from '@/lib/personel-audit'
import { YAN_ODEME_EKSI5_ETIKET, YAN_ODEME_BILGISAYARSIZ_ETIKET } from '@/lib/kazanc-yan-odeme'
import type { Tables } from '@/types/database'

export const TANIM_KAZANC_REF_TABLE = 'tanim_kazanc_bilgisi'

export const TANIM_KAZANC_ALAN_ETIKETLERI: Record<string, string> = {
  derece: 'Derece',
  sira_no: 'Sıra no',
  ogrenim: 'Öğrenim',
  ek_gosterge: 'Ek Gösterge',
  ek_odeme: 'Ek Ödeme',
  oht: 'ÖHT',
  yan_odeme: 'Yan Ödeme',
  yan_odeme_eksi5: YAN_ODEME_EKSI5_ETIKET,
  yan_odeme_bilgisayarsiz: YAN_ODEME_BILGISAYARSIZ_ETIKET,
  sds_orani: 'SDS',
}

export type TanimKazancAuditSatir = {
  id: number
  sira_no?: number | null
  ogrenim_id?: number | null
  derece?: number | null
  ek_gosterge?: string | null
  ek_odeme?: string | null
  oht?: string | null
  yan_odeme?: string | null
  yan_odeme_eksi5?: string | null
  yan_odeme_bilgisayarsiz?: string | null
  sds_orani?: string | null
  kazanc_grup_id?: string | null
}

export function tanimKazancAuditRefId(row: { id: number; kazanc_grup_id?: string | null }): string {
  const g = String(row.kazanc_grup_id ?? '').trim()
  return g || String(row.id)
}

export function tanimKazancAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}

export function tanimKazancAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = auditJsonKayit(onceki)
  const s = auditJsonKayit(sonraki)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  const norm = (v: unknown) => (v == null ? '' : String(v).trim())
  const oBos = !Object.keys(o).some(k => norm(o[k]))
  for (const alan of alanlar) {
    const etiket = TANIM_KAZANC_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    if (norm(eski) === norm(yeni)) continue
    out.push({
      alan,
      etiket,
      onceki: oBos && norm(yeni) ? '—' : eski,
      sonraki: yeni,
    })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export function tanimKazancAuditSnapshot(
  rows: TanimKazancAuditSatir[],
  ogrenimIsimById: Map<number, string>,
): Record<string, unknown> {
  if (!rows.length) return {}
  const sirali = [...rows].sort((a, b) => {
    const na = ogrenimIsimById.get(a.ogrenim_id ?? 0) ?? String(a.ogrenim_id ?? '')
    const nb = ogrenimIsimById.get(b.ogrenim_id ?? 0) ?? String(b.ogrenim_id ?? '')
    return na.localeCompare(nb, 'tr')
  })
  const r0 = sirali[0]
  const ogrenim = sirali
    .map(r => ogrenimIsimById.get(r.ogrenim_id ?? 0) ?? String(r.ogrenim_id ?? '—'))
    .join(', ')
  return {
    derece: r0.derece ?? '',
    sira_no: r0.sira_no ?? '',
    ogrenim,
    ek_gosterge: r0.ek_gosterge ?? '',
    ek_odeme: r0.ek_odeme ?? '',
    oht: r0.oht ?? '',
    yan_odeme: r0.yan_odeme ?? '',
    yan_odeme_eksi5: r0.yan_odeme_eksi5 ?? '',
    yan_odeme_bilgisayarsiz: r0.yan_odeme_bilgisayarsiz ?? '',
    sds_orani: r0.sds_orani ?? '',
  }
}

export function tanimKazancAuditOzet(islem: string, snap: Record<string, unknown>): string {
  const drc = String(snap.derece ?? '').trim()
  const og = String(snap.ogrenim ?? '').trim()
  const parca = [drc ? `${drc}. derece` : null, og || null].filter(Boolean).join(' · ')
  const fiil =
    islem === 'Ekle' ? 'eklendi' : islem === 'Sil' ? 'silindi' : 'güncellendi'
  return parca ? `${parca} kazanç tanımı ${fiil}.` : `Kazanç tanımı ${fiil}.`
}

export function tanimKazancGrupAuditLoglari(
  grup: { id: number; kazanc_grup_id?: string | null }[],
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>,
): Tables<'personel_audit_log'>[] {
  const keys = new Set<string>()
  for (const r of grup) {
    keys.add(tanimKazancAuditRefId(r))
    keys.add(String(r.id))
  }
  const seen = new Set<number>()
  const out: Tables<'personel_audit_log'>[] = []
  for (const k of keys) {
    for (const log of auditLoglarByRefId[k] ?? []) {
      if (seen.has(log.id)) continue
      seen.add(log.id)
      out.push(log)
    }
  }
  out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return out
}
