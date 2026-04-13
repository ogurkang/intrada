import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BelediyeKimlikFormuFormClient from '@/components/yerel-bilgi/BelediyeKimlikFormuFormClient'
import { belediyeBaskanSaltOku } from '../actions'

export default async function BelediyeKimlikFormuDetayPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const { id } = await Promise.resolve(params)
  const idNum = Number(id)
  if (!Number.isFinite(idNum) || idNum <= 0) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sb = supabase as any
  const { data } = await sb.from('yerel_bilgi_belediye_kimlik_formu').select('*').eq('id', idNum).maybeSingle()
  if (!data) notFound()
  const ro = await belediyeBaskanSaltOku()

  return (
    <BelediyeKimlikFormuFormClient
      mode="detay"
      id={idNum}
      baslik="Belediye Kimlik Formu — Detay"
      geriHref="/yerel-bilgi/islemler/belediye-kimlik-formu"
      readonlyAd={ro.ad}
      readonlySoyad={ro.soyad}
      readonlyTelefon={ro.telefon}
      baslangic={{
        belediye_kurulus_yili: data.belediye_kurulus_tarihi ? String(data.belediye_kurulus_tarihi).slice(0, 4) : '',
        baskan_cinsiyeti: data.baskan_cinsiyeti ?? '',
        baskan_secime_girdigi_parti: data.baskan_secime_girdigi_parti ?? '',
        baskan_mevcut_parti: data.baskan_mevcut_parti ?? '',
        baskan_donem: data.baskan_donem ?? '',
        belediye_web_adresi: data.belediye_web_adresi ?? '',
        belediye_e_posta: data.belediye_e_posta ?? '',
        belediye_telefon_numarasi: data.belediye_telefon_numarasi ?? '',
        belediye_faks_numarasi: data.belediye_faks_numarasi ?? '',
        belediye_cagri_merkezi: data.belediye_cagri_merkezi ?? '',
        belediye_onayli_sosyal_medya_hesabi: data.belediye_onayli_sosyal_medya_hesabi ?? '',
        belediye_acik_adresi: data.belediye_acik_adresi ?? '',
        mahalle_sayisi: data.mahalle_sayisi == null ? '' : String(data.mahalle_sayisi),
      }}
    />
  )
}

