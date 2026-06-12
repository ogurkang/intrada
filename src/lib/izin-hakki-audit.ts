export const IZIN_HAKKI_ALAN_ETIKETLERI: Record<string, string> = {
  yil: 'Yıl',
  devreden_gun: 'Devreden Gün',
  hak_edilen_gun: 'Hak Edilen Gün',
  kullanilan_gun: 'Kullanılan Gün',
  kalan_gun: 'Kalan Gün',
}

export function izinHakkiAuditDegerGoster(_alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  return String(deger)
}

export function izinHakkiAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = IZIN_HAKKI_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export function izinHakkiAuditRefId(sicilNo: string, yil: number): string {
  return `${sicilNo}-${yil}`
}
