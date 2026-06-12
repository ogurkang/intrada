export const AILE_ALAN_ETIKETLERI: Record<string, string> = {
  medeni_hal: 'Medeni Hal',
  esin_ad_soyad: 'Eş Ad Soyad',
  esin_tckn: 'Eş TCKN',
  is_durumu: 'İş Durumu',
  gelir_durumu: 'Gelir Durumu',
  cocuk_sayisi: 'Çocuk Sayısı',
}

export function aileAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const cocuklar = row.cocuklar_json
  const cocukSayisi = Array.isArray(cocuklar) ? cocuklar.length : 0
  return {
    medeni_hal: row.medeni_hal ?? null,
    esin_ad_soyad: row.esin_ad_soyad ?? null,
    esin_tckn: row.esin_tckn ?? null,
    is_durumu: row.is_durumu ?? null,
    gelir_durumu: row.gelir_durumu ?? null,
    cocuk_sayisi: cocukSayisi,
  }
}

export function aileAuditDegerGoster(_alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}

export function aileAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = aileAuditSnapshot((onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>)
  const s = aileAuditSnapshot((sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = AILE_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}
