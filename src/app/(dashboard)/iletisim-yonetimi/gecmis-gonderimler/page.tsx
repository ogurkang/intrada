import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { smsLogOlaylariGetir } from '@/lib/sms-log-durum'
import GecmisGonderimlerClient, {
  type SmsLogSatir,
} from '@/components/iletisim/GecmisGonderimlerClient'

export const dynamic = 'force-dynamic'

export default async function GecmisGonderimlerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const { data: logRaw, error: logErr } = await supabase
    .from('iletisim_sms_log')
    .select(
      'id, alici_ad, alici_sicil, telefon, mesaj, originator, durum, baglam, planlanan_gonderim_at, gonderim_kontrol_at, saglayici_mesaj_id, hata_mesaji, actor_email, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (logErr) {
    console.error('SMS_LOG_SELECT', logErr.message)
  }

  const loglar = (logRaw ?? []) as SmsLogSatir[]
  const olaylarByLogId = await smsLogOlaylariGetir(
    supabase,
    loglar.map(l => l.id),
  )

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/iletisim-yonetimi/sms-islemleri" className="hover:text-slate-800 transition-colors">
          İletişim Yönetimi
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Geçmiş Gönderimler</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Geçmiş Gönderimler</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gönderilen ve planlanan SMS kayıtları. Doğum günü mesajlarında iletim durumu sağlayıcıdan
          otomatik sorgulanır; satıra tıklayarak gelişmeleri görebilirsiniz.
        </p>
      </div>

      <GecmisGonderimlerClient loglar={loglar} olaylarByLogId={olaylarByLogId} />
    </div>
  )
}
