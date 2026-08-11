const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'unvan', etiket: 'Unvan' },
  { alan: 'mudurluk', etiket: 'Müdürlük' },
  { alan: 'cocuk_dogum_tarihi', etiket: 'Çocuğun Doğum Tarihi' },
  { alan: 'yari_zamanli_baslangic_tarihi', etiket: 'Yarı Zamanlı Başlangıç' },
  { alan: 'normal_zamanli_donus_tarihi', etiket: 'Normal Zamanlı Dönüş' },
  { alan: 'calisma_programi', etiket: 'Çalışma Programı' },
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
    const oncekiStr = alan === 'calisma_programi' ? JSON.stringify(ov ?? null) : String(ov ?? '')
    const sonrakiStr = alan === 'calisma_programi' ? JSON.stringify(sv ?? null) : String(sv ?? '')
    if (onceki == null) {
      if (sonrakiStr !== '' && sonrakiStr !== 'null') rows.push({ alan, etiket, onceki: null, sonraki: sv })
      continue
    }
    if (oncekiStr !== sonrakiStr) {
      rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
    }
  }
  return rows
}

export function yzcAuditDegerGoster(alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  if (!v && alan !== 'calisma_programi') return '—'
  if (alan === 'calisma_programi') {
    if (deger == null || typeof deger !== 'object') return '—'
    const src = deger as Record<string, unknown>
    const gunler = Object.entries(src)
      .filter(([, saatler]) => Array.isArray(saatler) && saatler.length > 0)
      .map(([gun, saatler]) => `${gun}: ${(saatler as string[]).join(', ')}`)
    return gunler.length ? gunler.join(' · ') : '—'
  }
  if (alan.endsWith('_tarihi') && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, g] = v.split('-')
    return `${g}.${m}.${y}`
  }
  return v
}
