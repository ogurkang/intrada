import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsGruplari } from '@/lib/sms-grup'
import SmsGrupListeClient from '@/components/iletisim/SmsGrupListeClient'

export const dynamic = 'force-dynamic'

export default async function SmsGrupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const gruplar = await fetchSmsGruplari(supabase)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <span className="text-slate-400">İletişim Yönetimi</span>
        <span className="text-slate-300">/</span>
        <Link href="/iletisim-yonetimi/sms-islemleri" className="text-slate-500 hover:text-slate-700">
          SMS İşlemleri
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Grup Mesajları</span>
      </nav>

      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👥 Grup Mesajları</h1>
          <p className="text-sm text-slate-500 mt-1">Grup oluşturun, detayına girip personel ekleyin ve gruba mesaj gönderin.</p>
        </div>
        <Link
          href="/iletisim-yonetimi/sms-islemleri"
          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          SMS İşlemleri
        </Link>
      </div>

      <SmsGrupListeClient gruplar={gruplar} />
    </div>
  )
}
