export type FirmaCalisanRaporRow = {
  sicil_no: string | null
  ad_soyad: string
  tckn: string | null
  cinsiyet: string | null
  dogum_tarihi: string | null
  ogrenim: string | null
  telefon: string | null
  e_posta: string | null
  kuruma_giris_tarihi: string | null
  gorev_mudurlugu: string | null
  gorevi: string | null
  ayrilis_tarihi: string | null
}

export interface AdabelPersonelBilgileriSatir {
  sicil_no: string
  ad_soyad: string
  tckn: string
  cinsiyet: string
  dogum_tarihi: string
  ogrenim: string
  telefon: string
  e_posta: string
  kuruma_giris_tarihi: string
  gorev_yeri: string
}

function txt(v: string | null | undefined) {
  const s = String(v ?? '').trim()
  return s || '—'
}

function tarih(v: string | null | undefined) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('tr-TR')
}

function gorevYeri(mudurluk: string | null | undefined, gorevi: string | null | undefined) {
  const m = String(mudurluk ?? '').trim()
  const g = String(gorevi ?? '').trim()
  if (m && g) return `${m} / ${g}`
  return m || g || '—'
}

/** D tarihinde aktif ADABEL personeli (giriş ≤ D, ayrılış yok veya > D). */
export function firmaCalisanAktifMiAtDate(row: FirmaCalisanRaporRow, D: string): boolean {
  const giris = String(row.kuruma_giris_tarihi ?? '').trim().slice(0, 10)
  if (giris && giris > D) return false
  const ayrilis = String(row.ayrilis_tarihi ?? '').trim().slice(0, 10)
  if (!ayrilis) return true
  return ayrilis > D
}

export function adabelPersonelBilgileriListeSnapshot(input: {
  D: string
  kayitlar: FirmaCalisanRaporRow[]
}): AdabelPersonelBilgileriSatir[] {
  const { D, kayitlar } = input
  const out: AdabelPersonelBilgileriSatir[] = []

  for (const k of kayitlar) {
    if (!firmaCalisanAktifMiAtDate(k, D)) continue
    out.push({
      sicil_no: txt(k.sicil_no),
      ad_soyad: txt(k.ad_soyad),
      tckn: txt(k.tckn),
      cinsiyet: txt(k.cinsiyet),
      dogum_tarihi: tarih(k.dogum_tarihi),
      ogrenim: txt(k.ogrenim),
      telefon: txt(k.telefon),
      e_posta: txt(k.e_posta),
      kuruma_giris_tarihi: tarih(k.kuruma_giris_tarihi),
      gorev_yeri: gorevYeri(k.gorev_mudurlugu, k.gorevi),
    })
  }

  out.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))
  return out
}
