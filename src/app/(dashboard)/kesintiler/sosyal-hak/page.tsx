import { createClient } from '@/lib/supabase/server'
import SosyalHakKesintileriClient from '@/components/kesintiler/SosyalHakKesintileriClient'
import type { Donem } from '@/components/kesintiler/DonemListClient'
import {
  donemEkle   as rmyDonemEkle,
  donemGuncelle as rmyDonemGuncelle,
  donemKapat  as rmyDonemKapat,
  donemAc     as rmyDonemAc,
  secimGetir  as rmySecimGetir,
  secimKaydet as rmySecimKaydet,
} from '../rmy/actions'
import {
  donemEkle   as ivyDonemEkle,
  donemGuncelle as ivyDonemGuncelle,
  donemKapat  as ivyDonemKapat,
  donemAc     as ivyDonemAc,
  secimGetir  as ivySecimGetir,
  secimKaydet as ivySecimKaydet,
} from '../ivy/actions'
import {
  donemEkle   as izyDonemEkle,
  donemGuncelle as izyDonemGuncelle,
  donemKapat  as izyDonemKapat,
  donemAc     as izyDonemAc,
  secimGetir  as izySecimGetir,
  secimKaydet as izySecimKaydet,
} from '../izy/actions'

export default async function SosyalHakKesintileriPage() {
  const supabase = await createClient()

  const [rmyDonemRes, ivyDonemRes, izyDonemRes] = await Promise.all([
    supabase.from('raporlu_memurlar_yeni_donem').select('*').order('id', { ascending: false }),
    supabase.from('izinli_vekiller_yeni_donem').select('*').order('id', { ascending: false }),
    supabase.from('izinli_zabitalar_yeni_donem').select('*').order('id', { ascending: false }),
  ])

  function toDonemler(raw: typeof rmyDonemRes['data']): Donem[] {
    return (raw ?? []) as Donem[]
  }

  return (
    <SosyalHakKesintileriClient
      rmy={{
        donemler:    toDonemler(rmyDonemRes.data),
        kuralMetni:  'Statüsü Memur olan personelin izin durumu "iptal edildi" hariç olmak üzere izin türü Rapor ve Refakatçi Raporu olanlar listelenir.',
        detayBase:   '/kesintiler/rmy',
        onEkle:        rmyDonemEkle,
        onGuncelle:    rmyDonemGuncelle,
        onKapat:       rmyDonemKapat,
        onAc:          rmyDonemAc,
        onSecimGetir:  rmySecimGetir,
        onSecimKaydet: rmySecimKaydet,
      }}
      ivy={{
        donemler:    toDonemler(ivyDonemRes.data),
        kuralMetni:  'Kadro Hareketlerinde vekil olarak yer alan personelin izin durumu "iptal edildi" hariç tüm türlere ait izinleri listelenir.',
        detayBase:   '/kesintiler/ivy',
        onEkle:        ivyDonemEkle,
        onGuncelle:    ivyDonemGuncelle,
        onKapat:       ivyDonemKapat,
        onAc:          ivyDonemAc,
        onSecimGetir:  ivySecimGetir,
        onSecimKaydet: ivySecimKaydet,
      }}
      izy={{
        donemler:    toDonemler(izyDonemRes.data),
        kuralMetni:  'Zabıta Müdürlüğü ile ilişkilendirilmiş personelin izin durumu "iptal edildi" hariç Yıllık İzin, Ölüm İzni, Evlilik İzni, Babalık İzni, Mehil İzni, Mazeret İzni, İdari İzin, Doğum Öncesi Çalışamaz ve Doğum Sonrası Çalışamaz türündeki izinleri listelenir.',
        detayBase:   '/kesintiler/izy',
        onEkle:        izyDonemEkle,
        onGuncelle:    izyDonemGuncelle,
        onKapat:       izyDonemKapat,
        onAc:          izyDonemAc,
        onSecimGetir:  izySecimGetir,
        onSecimKaydet: izySecimKaydet,
      }}
    />
  )
}
