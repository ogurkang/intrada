export const OGRENIM_ALAN_ETIKETLERI: Record<string, string> = {
  ogrenim_turu: 'Öğrenim Türü',
  okul_adi: 'Okul Adı',
  bolum: 'Bölüm',
  meslegi: 'Mesleği',
  mezuniyet_yili: 'Mezuniyet Yılı',
  mezuniyet_tarihi: 'Mezuniyet Tarihi',
  varsayilan: 'Varsayılan',
  aktif: 'Aktif',
}

const TARIH_ALANLARI = new Set(['mezuniyet_tarihi'])

function tarihGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('tr-TR')
}

export function ogrenimAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'varsayilan' || alan === 'aktif') return deger ? 'Evet' : 'Hayır'
  if (TARIH_ALANLARI.has(alan)) return tarihGoster(deger)
  return String(deger)
}

export function ogrenimAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = OGRENIM_ALAN_ETIKETLERI[alan] ?? alan
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
