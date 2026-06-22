import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
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

  const { data: logRaw } = await supabase
    .from('iletisim_sms_log')
    .select('id, alici_ad, alici_sicil, telefon, mesaj, originator, durum, hata_mesaji, actor_email, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

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
        <p className="text-sm text-slate-500 mt-1">Gönderilen SMS kayıtları (en son 500 kayıt).</p>
      </div>

      <GecmisGonderimlerClient loglar={(logRaw as SmsLogSatir[]) ?? []} />
    </div>
  )
}
