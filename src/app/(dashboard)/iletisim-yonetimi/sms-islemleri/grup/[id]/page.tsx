import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsIslemleriVeri } from '@/lib/sms-islemleri-data'
import { fetchSmsGruplari } from '@/lib/sms-grup'
import SmsGrupDetayClient from '@/components/iletisim/SmsGrupDetayClient'

export const dynamic = 'force-dynamic'

export default async function SmsGrupDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const grupId = Number(id)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const [veri, gruplar] = await Promise.all([fetchSmsIslemleriVeri(supabase), fetchSmsGruplari(supabase)])
  const grup = gruplar.find(g => g.id === grupId)
  if (!grup) notFound()

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/iletisim-yonetimi/sms-islemleri" className="text-slate-500 hover:text-slate-700">
          SMS İşlemleri
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/iletisim-yonetimi/sms-islemleri/grup" className="text-slate-500 hover:text-slate-700">
          Grup Mesajları
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{grup.ad}</span>
      </nav>

      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">👥 {grup.ad}</h1>
        <Link
          href="/iletisim-yonetimi/sms-islemleri/grup"
          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Grup Mesajları
        </Link>
      </div>

      <SmsGrupDetayClient
        grup={grup}
        personeller={veri.personeller}
        sablonlar={veri.sablonlar}
        originatorlar={veri.originatorlar}
        gonderimAcik={veri.gonderimAcik}
      />
    </div>
  )
}
