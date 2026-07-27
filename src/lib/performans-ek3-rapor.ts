/** Ek-3 Personel Değerlendirme Cetveli — veri modeli ve yardımcılar */

export type PerformansEk3Satir = {
  sira: number
  degerlendirme_id: number
  sicil_no: string
  ad_soyad: string
  unvan: string | null
  mudurluk_adi: string | null
  puan_amir1: number | null
  puan_amir2: number | null
  ortalama: number | null
  amir1_sicil: string | null
  amir2_sicil: string | null
  amir1_ad: string | null
  amir2_ad: string | null
}

export type PerformansEk3MudurlukGrup = {
  mudurluk_adi: string
  satirlar: PerformansEk3Satir[]
}

export type PerformansEk2Satir = {
  degerlendirme_id: number
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  gorev: string | null
  statu: string | null
  mudurluk_adi: string | null
  ortalama: number | null
  bant: 'cok_yetersiz' | 'yetersiz'
  amir1_ad: string | null
  amir2_ad: string | null
}

const TAMAMLANMIS_DURUMLAR = ['amir2_onay', 'tamamlandi'] as const

export function performansEk3TamamlanmisMi(durum: string): boolean {
  return (TAMAMLANMIS_DURUMLAR as readonly string[]).includes(durum)
}

export function performansEk2DusukMu(ortalama: number | null | undefined): boolean {
  return ortalama != null && Number.isFinite(ortalama) && ortalama <= 59
}

export function performansEk2Bant(
  ortalama: number | null | undefined,
): 'cok_yetersiz' | 'yetersiz' | null {
  if (ortalama == null || !Number.isFinite(ortalama)) return null
  if (ortalama <= 34) return 'cok_yetersiz'
  if (ortalama <= 59) return 'yetersiz'
  return null
}

export function performansEk2BantEtiket(bant: 'cok_yetersiz' | 'yetersiz'): string {
  return bant === 'cok_yetersiz' ? '0–34 Çok Yetersiz' : '35–59 Yetersiz'
}

/** Müdürlük adına göre grupla; müdürlük içi sicil sırası */
export function performansEk3MudurlukGrupla(
  kayitlar: { mudurluk_adi: string | null; satir: Omit<PerformansEk3Satir, 'sira'> }[],
): PerformansEk3MudurlukGrup[] {
  const byMud = new Map<string, Omit<PerformansEk3Satir, 'sira'>[]>()
  for (const k of kayitlar) {
    const mud = (k.mudurluk_adi ?? '—').trim() || '—'
    if (!byMud.has(mud)) byMud.set(mud, [])
    byMud.get(mud)!.push(k.satir)
  }

  return [...byMud.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([mudurluk_adi, liste]) => {
      const sirali = [...liste].sort((a, b) =>
        a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
      )
      return {
        mudurluk_adi,
        satirlar: sirali.map((s, i) => ({ ...s, sira: i + 1 })),
      }
    })
}
