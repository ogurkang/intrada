import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsAyar } from '@/lib/sms-ayar'
import { fetchSmsSablonlari } from '@/lib/sms-sablon'
import SmsAyarTanimClient from '@/components/iletisim/SmsAyarTanimClient'
import SmsSablonTanimClient, { type SablonGorunum } from '@/components/iletisim/SmsSablonTanimClient'
import { smsAyarKaydet, smsKrediSorgulaAction, sablonKaydet, sablonSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function IletisimTanimlarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const [ayar, sablonlar] = await Promise.all([fetchSmsAyar(supabase), fetchSmsSablonlari(supabase)])
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
          SMS sağlayıcı (mesajpaketi.com) API bilgilerini buradan tanımlayın. Bilgiler yalnızca yöneticiler tarafından
          görüntülenip düzenlenebilir.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <SmsAyarTanimClient
          ayar={{
            api_base_url: ayar?.api_base_url ?? 'https://www.mesajpaketi.com',
            kullanici_adi: ayar?.kullanici_adi ?? '',
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
    </div>
  )
}
