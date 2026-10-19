import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsAyar } from '@/lib/sms-ayar'
import { smsGatewayAdresi } from '@/lib/sms-mesajpaketi'
import { fetchSmsSablonlari } from '@/lib/sms-sablon'
import SmsAyarTanimClient from '@/components/iletisim/SmsAyarTanimClient'
import SmsSablonTanimClient, { type SablonGorunum } from '@/components/iletisim/SmsSablonTanimClient'
import EpostaAyarTanimClient from '@/components/iletisim/EpostaAyarTanimClient'
import { EPOSTA_VARSAYILAN, fetchEpostaAyar } from '@/lib/eposta-ayar'
import { epostaAyarKaydet, smsAyarKaydet, smsKrediSorgulaAction, sablonKaydet, sablonSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function IletisimTanimlarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const [ayar, sablonlar, eposta] = await Promise.all([
    fetchSmsAyar(supabase),
    fetchSmsSablonlari(supabase),
    fetchEpostaAyar(supabase),
  ])
  const sablonGorunum: SablonGorunum[] = sablonlar.map(s => ({
    id: s.id,
    tur: s.tur,
    baslik: s.baslik,
    metin: s.metin,
    aktif: s.aktif,
  }))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/iletisim-yonetimi/sms-islemleri" className="hover:text-slate-800 transition-colors">
          İletişim Yönetimi
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Tanımlar</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İletişim Tanımları</h1>
        <p className="text-sm text-slate-500 mt-1">
          SMS ve e-posta bilgilerini buradan tanımlayın. Bilgiler yalnızca yöneticiler tarafından
          görüntülenip düzenlenebilir.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <SmsAyarTanimClient
          ayar={{
            api_base_url: smsGatewayAdresi(ayar?.api_base_url),
            kullanici_adi: ayar?.kullanici_adi ?? '',
            bayi_kodu: ayar?.bayi_kodu ?? '',
            originator: ayar?.originator ?? '',
            originator2: ayar?.originator2 ?? '',
            originator3: ayar?.originator3 ?? '',
            turkce_karakter: ayar?.turkce_karakter ?? true,
            aktif: ayar?.aktif ?? false,
            sifre_var: Boolean(ayar?.sifre),
          }}
          onKaydet={smsAyarKaydet}
          onKrediSorgula={smsKrediSorgulaAction}
        />

        <SmsSablonTanimClient sablonlar={sablonGorunum} onKaydet={sablonKaydet} onSil={sablonSil} />
      </div>

      <div className="mt-6">
        <EpostaAyarTanimClient
          ayar={{
            adres: eposta?.adres || EPOSTA_VARSAYILAN.adres,
            gorunen_ad: eposta?.gorunen_ad || EPOSTA_VARSAYILAN.gorunenAd,
            imap_host: eposta?.imap_host || EPOSTA_VARSAYILAN.imapHost,
            imap_port: eposta?.imap_port || EPOSTA_VARSAYILAN.imapPort,
            smtp_host: eposta?.smtp_host || EPOSTA_VARSAYILAN.smtpHost,
            smtp_port: eposta?.smtp_port || EPOSTA_VARSAYILAN.smtpPort,
            imza_metin: eposta?.imza_metin ?? '',
            aktif: eposta?.aktif ?? false,
            sifre_var: Boolean(eposta?.sifre),
          }}
          onKaydet={epostaAyarKaydet}
        />
      </div>
    </div>
  )
}
