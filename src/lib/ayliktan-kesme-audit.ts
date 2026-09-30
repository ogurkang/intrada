const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'unvan', etiket: 'Unvan' },
  { alan: 'mudurluk', etiket: 'Müdürlük' },
  { alan: 'payda', etiket: 'Ceza oranı' },
  { alan: 'maas', etiket: 'Maaş katsayısı' },
  { alan: 'tabanAylik', etiket: 'Taban aylık katsayısı' },
  { alan: 'yanOdeme', etiket: 'Yan ödeme katsayısı' },
  { alan: 'toplam', etiket: 'Kesinti toplamı' },
  { alan: 'yarim_zamanli', etiket: 'Yarım zamanlı' },
]

export function ayliktanKesmeAuditDiffSatirlari(
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

export function ayliktanKesmeAuditDegerGoster(alan: string, deger: unknown): string {
  if (alan === 'payda' && deger != null && String(deger) !== '') return `1/${deger}`
  if (alan === 'yarim_zamanli') return deger === true || deger === 'true' ? 'Evet' : 'Hayır'
  const v = deger == null ? '' : String(deger).trim()
  return v || '—'
}
