const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'unvan', etiket: 'Unvan' },
  { alan: 'mudurluk', etiket: 'Müdürlük' },
  { alan: 'cocuk_dogum_tarihi', etiket: 'Çocuğun Doğum Tarihi' },
  { alan: 'yari_zamanli_baslangic_tarihi', etiket: 'Yarı Zamanlı Başlangıç' },
  { alan: 'normal_zamanli_donus_tarihi', etiket: 'Normal Zamanlı Dönüş' },
]

export function yzcAuditDiffSatirlari(
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

export function yzcAuditDegerGoster(alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  if (!v) return '—'
  if (alan.endsWith('_tarihi') && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, g] = v.split('-')
    return `${g}.${m}.${y}`
  }
  return v
}
