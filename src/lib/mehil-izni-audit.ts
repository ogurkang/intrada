const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'geldigi_kurum', etiket: 'Geldiği Kurum' },
  { alan: 'nakil_tarihi', etiket: 'Nakil Tarihi' },
  { alan: 'mehil_baslangic_tarihi', etiket: 'Mehil Başlangıç Tarihi' },
  { alan: 'mehil_bitis_tarihi', etiket: 'Mehil Bitiş Tarihi' },
]

export function mehilIzniAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []

  for (const { alan, etiket } of ALANLAR) {
    const ov = o[alan]
    const sv = s[alan]
    if (onceki == null) {
      if (sv != null && String(sv) !== '') rows.push({ alan, etiket, onceki: null, sonraki: sv })
      continue
    }
    if (String(ov ?? '') !== String(sv ?? '')) {
      rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
    }
  }
  return rows
}

export function mehilIzniAuditDegerGoster(alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  if (!v) return '—'
  if (alan.endsWith('_tarihi')) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, g] = v.split('-')
      return `${g}.${m}.${y}`
    }
  }
  return v
}
