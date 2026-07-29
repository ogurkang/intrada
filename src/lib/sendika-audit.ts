export const SENDIKA_ALAN_ETIKETLERI: Record<string, string> = {
  sendika_id: 'Sendika',
  kisa_ad: 'Sendika Kısa Adı',
  baslangic_tarihi: 'Başlangıç Tarihi',
  bitis_tarihi: 'Bitiş Tarihi',
  aktif: 'Aktif',
}

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function sendikaAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'aktif') return deger ? 'Evet' : 'Hayır'
  if (alan === 'baslangic_tarihi' || alan === 'bitis_tarihi') return tarihGoster(deger)
  return String(deger)
}

export function sendikaAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = SENDIKA_ALAN_ETIKETLERI[alan] ?? alan
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
