export const IZIN_ALAN_ETIKETLERI: Record<string, string> = {
  yil: 'Yıl',
  sira_no: 'Sıra No',
  tur: 'Tür',
  ayrilis: 'Ayrılış',
  baslama: 'Başlama',
  gun: 'Gün',
  vekalet: 'Vekalet',
  aciklama: 'Açıklama',
  durum: 'Durum',
  bilgi: 'Bilgi',
}

const TARIH_ALANLARI = new Set(['ayrilis', 'baslama'])

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function izinAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  if (alan === 'gun') return String(deger)
  return String(deger)
}

export interface IzinAuditDiffSatir {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}

export function izinAuditDiffSatirlari(onceki: unknown, sonraki: unknown): IzinAuditDiffSatir[] {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: IzinAuditDiffSatir[] = []
  for (const alan of alanlar) {
    const etiket = IZIN_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => (v == null ? '' : String(v).trim())
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}
