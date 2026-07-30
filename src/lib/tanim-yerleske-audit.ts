import { auditJsonKayit } from '@/lib/personel-audit'

export const TANIM_YERLESKE_ALAN_ETIKETLERI: Record<string, string> = {
  yerleske_adi: 'Yerleşke Adı',
  adres: 'Adres',
  aktif: 'Durum',
}

export function tanimYerleskeAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'aktif') return deger ? 'Aktif' : 'Pasif'
  return String(deger)
}

export function tanimYerleskeAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
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
    const etiket = TANIM_YERLESKE_ALAN_ETIKETLERI[alan] ?? alan
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

export function tanimYerleskeAuditSnapshot(row: {
  yerleske_adi?: string | null
  adres?: string | null
  aktif?: boolean | null
}): Record<string, unknown> {
  return {
    yerleske_adi: row.yerleske_adi ?? '',
    adres: row.adres ?? '',
    aktif: row.aktif !== false,
  }
}
