'use server'
import { makeDonemActions } from '@/lib/kesinti-actions'

const { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } =
  makeDonemActions('aylik_yemek_yeni_donem', 'aylik_yemek_yeni_secim', '/kesintiler/ayy', { memurSozlesmeliFilter: true })

export { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet }
