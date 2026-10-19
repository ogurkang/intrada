export type EpostaKutu = 'gelen' | 'giden' | 'spam'

export interface EpostaOzet {
  uid: string
  kim: string
  konu: string
  tarih: string
  okunmadi: boolean
}

export interface EpostaEkBilgi {
  sira: number
  ad: string
  boyut: number
}

export interface EpostaMesaj {
  uid: string
  kim: string
  kime: string
  konu: string
  tarih: string
  metin: string
  html: string
  messageId: string
  ekler: EpostaEkBilgi[]
}
