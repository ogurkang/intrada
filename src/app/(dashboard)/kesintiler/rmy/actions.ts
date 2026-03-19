'use server'
import { makeDonemActions } from '@/lib/kesinti-actions'

const { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } =
  makeDonemActions('raporlu_memurlar_yeni_donem', 'raporlu_memurlar_yeni_secim', '/kesintiler/rmy', { memurFilter: true })

export { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet }
