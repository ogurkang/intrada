const ALANLAR = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'unvan', etiket: 'Unvan' },
  { alan: 'mudurluk', etiket: 'Müdürlük' },
] as const

export function calismaBelgesiAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const { alan, etiket } of ALANLAR) {
    const sv = s[alan]
    if (onceki == null) {
      if (sv != null && String(sv) !== '') rows.push({ alan, etiket, onceki: null, sonraki: sv })
      continue
    }
    const ov = o[alan]
    if (String(ov ?? '') !== String(sv ?? '')) rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
  }
  return rows
}

export function calismaBelgesiAuditDegerGoster(_alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  return v || '—'
}
