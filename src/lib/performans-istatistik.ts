/** Performans değerlendirme ilerleme hesapları */

export type PerformansDegOzet = {
  id: number
  sicil_no: string
  durum: string
  tek_amir: boolean
  mudurluk_adi?: string | null
  gorev_mudurlugu?: string | null
  kadro_mudurlugu?: string | null
  puan_amir1?: number | null
  puan_amir2?: number | null
}

export function amir1Tamamlandi(r: Pick<PerformansDegOzet, 'durum' | 'tek_amir'>): boolean {
  if (r.tek_amir) return r.durum === 'tamamlandi'
  return ['amir1_gonderildi', 'amir2_onay', 'tamamlandi'].includes(r.durum)
}

export function amir2Tamamlandi(r: Pick<PerformansDegOzet, 'durum' | 'tek_amir'>): boolean {
  if (r.tek_amir) return false
  return ['amir2_onay', 'tamamlandi'].includes(r.durum)
}

export function degerlendirmeTamamlandi(r: Pick<PerformansDegOzet, 'durum'>): boolean {
  return ['amir2_onay', 'tamamlandi'].includes(r.durum)
}

export function yuzdeHesapla(tamam: number, toplam: number): number {
  if (toplam <= 0) return 0
  return Math.round((tamam / toplam) * 100)
}

export function donemIlerlemeOzet(liste: PerformansDegOzet[]) {
  const amir1Tamam = liste.filter(amir1Tamamlandi).length
  const amir2Havuz = liste.filter(r => !r.tek_amir)
  const amir2Tamam = amir2Havuz.filter(amir2Tamamlandi).length
  const genelTamam = liste.filter(degerlendirmeTamamlandi).length

  return {
    amir1Yuzde: yuzdeHesapla(amir1Tamam, liste.length),
    amir2Yuzde: yuzdeHesapla(amir2Tamam, amir2Havuz.length),
    genelYuzde: yuzdeHesapla(genelTamam, liste.length),
    amir1Tamam,
    amir1Toplam: liste.length,
    amir2Tamam,
    amir2Toplam: amir2Havuz.length,
    genelTamam,
    genelToplam: liste.length,
  }
}

export type MudurlukSatir = {
  siraNo: number
  mudurlukAdi: string
  personelSayisi: number
  tamamlanmaYuzde: number
}

/** Müdürlük özet satırları (alfabetik tanım listesine göre) */
export function mudurlukSatirlariOlustur(
  mudurlukAdlari: string[],
  liste: PerformansDegOzet[],
  eslesir: (
    mudurlukAdi: string,
    r: Pick<PerformansDegOzet, 'mudurluk_adi' | 'gorev_mudurlugu' | 'kadro_mudurlugu'>,
  ) => boolean,
): MudurlukSatir[] {
  return mudurlukAdlari.map((mudurlukAdi, i) => {
    const personel = liste.filter(r =>
      eslesir(mudurlukAdi, {
        mudurluk_adi: r.mudurluk_adi,
        gorev_mudurlugu: r.gorev_mudurlugu,
        kadro_mudurlugu: r.kadro_mudurlugu,
      }),
    )
    const tamam = personel.filter(degerlendirmeTamamlandi).length
    return {
      siraNo: i + 1,
      mudurlukAdi,
      personelSayisi: personel.length,
      tamamlanmaYuzde: personel.length === 0 ? 0 : Math.round((tamam / personel.length) * 100),
    }
  })
}
