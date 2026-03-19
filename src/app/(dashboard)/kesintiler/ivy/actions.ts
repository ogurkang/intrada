'use server'
import { makeDonemActions } from '@/lib/kesinti-actions'

const { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } =
  makeDonemActions('izinli_vekiller_yeni_donem', 'izinli_vekiller_yeni_secim', '/kesintiler/ivy', { vekilFilter: true })

export { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet }
