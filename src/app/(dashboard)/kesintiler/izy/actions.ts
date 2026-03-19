'use server'
import { makeDonemActions } from '@/lib/kesinti-actions'

const { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } =
  makeDonemActions('izinli_zabitalar_yeni_donem', 'izinli_zabitalar_yeni_secim', '/kesintiler/izy', { zabitaFilter: true })

export { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet }
