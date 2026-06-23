export interface SmsPersonelSatir {
  sicil_no: string
  ad_soyad: string
  telefon: string
  telefon_gecerli: boolean
  mudurluk: string
  statu: string
  dogum_tarihi: string | null
}

export interface SmsBebekSatir {
  key: string
  sicil_no: string
  ad_soyad: string
  telefon: string
  telefon_gecerli: boolean
  cocuk_adi: string
  cocuk_dogum: string
}

export interface SmsSablonSecenek {
  id: number
  tur: string
  baslik: string
  metin: string
}
