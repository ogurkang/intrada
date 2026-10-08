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
    const uzun = row.tanim_sendika?.uzun_ad || row.tanim_sendika?.kisa_ad
    if (uzun) aktifSendikaUzunAd[sicil] = uzun
  }

  const { data: kapananRaw } = await supabase
    .from('personel_sendika')
    .select('sicil_no, bitis_tarihi')
    .eq('aktif', false)
    .not('bitis_tarihi', 'is', null)
  const sonUyelikBitis: Record<string, string> = {}
  for (const row of kapananRaw ?? []) {
    const iso = String(row.bitis_tarihi ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue
    const onceki = sonUyelikBitis[row.sicil_no]
    const gg = `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
    if (!onceki || gg.split('.').reverse().join('-') > onceki.split('.').reverse().join('-')) {
      sonUyelikBitis[row.sicil_no] = gg
    }
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
        sonUyelikBitis={sonUyelikBitis}
        onKaydet={sendikaIstifaEkle}
      />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return (
    <SendikaIstifaFormClient
      personeller={personeller}
      aktifSendikaUzunAd={aktifSendikaUzunAd}
      sonUyelikBitis={sonUyelikBitis}
      onKaydet={sendikaIstifaEkle}
    />
  )
}
