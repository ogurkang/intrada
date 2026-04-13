import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BelediyeKimlikFormuFormClient from '@/components/yerel-bilgi/BelediyeKimlikFormuFormClient'
import { belediyeBaskanSaltOku } from '../actions'

export default async function BelediyeKimlikFormuEklePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ro = await belediyeBaskanSaltOku()
  return (
    <BelediyeKimlikFormuFormClient
      mode="ekle"
      baslik="Belediye Kimlik Formu — Kayıt Ekle"
      geriHref="/yerel-bilgi/islemler/belediye-kimlik-formu"
      readonlyAd={ro.ad}
      readonlySoyad={ro.soyad}
      readonlyTelefon={ro.telefon}
      baslangic={{
        belediye_kurulus_yili: '',
        baskan_cinsiyeti: '',
        baskan_secime_girdigi_parti: '',
        baskan_mevcut_parti: '',
        baskan_donem: '',
        belediye_web_adresi: '',
        belediye_e_posta: '',
        belediye_telefon_numarasi: '',
        belediye_faks_numarasi: '',
        belediye_cagri_merkezi: '',
        belediye_onayli_sosyal_medya_hesabi: '',
        belediye_acik_adresi: '',
        mahalle_sayisi: '',
      }}
    />
  )
}

