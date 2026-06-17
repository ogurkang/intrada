export const TANIM_ADRES_ALAN_ETIKETLERI: Record<string, string> = {
  il: 'İl',
  ilce: 'İlçe',
  mahalle_adi: 'Mahalle',
  aktif: 'Durum',
}

export function tanimAdresAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'aktif') return deger ? 'Aktif' : 'Pasif'
  return String(deger)
}

export function tanimAdresAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = TANIM_ADRES_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => {
      if (typeof v === 'boolean') return v ? '1' : '0'
      return v == null ? '' : String(v).trim()
    }
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export function tanimAdresAuditSnapshot(row: {
  il?: string | null
  ilce?: string | null
  mahalle_adi?: string | null
  aktif?: boolean | null
}): Record<string, unknown> {
  return {
    il: row.il ?? '',
    ilce: row.ilce ?? '',
    mahalle_adi: row.mahalle_adi ?? '',
    aktif: row.aktif !== false,
  }
}
