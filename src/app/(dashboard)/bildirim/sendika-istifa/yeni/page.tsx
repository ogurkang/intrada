import { createClient } from '@/lib/supabase/server'
import SendikaIstifaFormClient from '@/components/bildirim/SendikaIstifaFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { sendikaIstifaEkle } from '../../calisma-belgesi/actions'
import { fetchAktifPersonelSendika } from '@/lib/personel-sendika-load'

export default async function SendikaIstifaYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  const sendikaBySicil = await fetchAktifPersonelSendika(supabase)
  const aktifSendikaUzunAd: Record<string, string> = {}
  for (const [sicil, row] of sendikaBySicil) {
    const uzun = row.tanim_sendika?.uzun_ad
    if (uzun) aktifSendikaUzunAd[sicil] = uzun
  }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getBildirimFormPersonel(supabase, sicil)
    const personeller: BildirimFormPersonel[] = kendi ? [kendi] : []
    return (
      <SendikaIstifaFormClient
        personeller={personeller}
        sabitSicil={sicil}
        aktifSendikaUzunAd={aktifSendikaUzunAd}
        onKaydet={sendikaIstifaEkle}
      />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return (
    <SendikaIstifaFormClient
      personeller={personeller}
      aktifSendikaUzunAd={aktifSendikaUzunAd}
      onKaydet={sendikaIstifaEkle}
    />
  )
}
