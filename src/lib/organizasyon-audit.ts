import { auditJsonKayit } from '@/lib/personel-audit'

export const ORGANIZASYON_ALAN_ETIKETLERI: Record<string, string> = {
  organizasyon_adi: 'Organizasyon Adı',
  aktif: 'Durum',
  birim: 'Birim',
  ust_birim: 'Bağlı Olduğu Birim',
}

export function organizasyonAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'aktif') return deger ? 'Aktif' : 'Pasif'
  return String(deger)
}

export function organizasyonAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = auditJsonKayit(onceki)
  const s = auditJsonKayit(sonraki)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  const norm = (v: unknown) => {
    if (typeof v === 'boolean') return v ? '1' : '0'
    return v == null ? '' : String(v).trim()
  }
  const oBos = !Object.keys(o).some(k => norm(o[k]))
  for (const alan of alanlar) {
    const etiket = ORGANIZASYON_ALAN_ETIKETLERI[alan] ?? alan
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

export function organizasyonAuditSnapshot(row: {
  organizasyon_adi?: string | null
  aktif?: boolean | null
}): Record<string, unknown> {
  return {
    organizasyon_adi: row.organizasyon_adi ?? '',
    aktif: row.aktif !== false,
  }
}
