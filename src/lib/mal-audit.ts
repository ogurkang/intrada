export const MAL_ALAN_ETIKETLERI: Record<string, string> = {
  beyan_turu: 'Beyan Türü',
  onay_tarihi: 'Onay Tarihi',
  son_net_maas: 'Son Net Maaş',
  aciklama: 'Açıklama',
}

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function malAuditSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return {
    beyan_turu: row.beyan_turu ?? null,
    onay_tarihi: row.onay_tarihi ?? null,
    son_net_maas: row.son_net_maas ?? null,
    aciklama: row.aciklama ?? null,
  }
}

export function malAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'onay_tarihi') return tarihGoster(deger)
  if (alan === 'son_net_maas') return String(deger)
  return String(deger)
}

export function malAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = malAuditSnapshot((onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>)
  const s = malAuditSnapshot((sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = MAL_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}
