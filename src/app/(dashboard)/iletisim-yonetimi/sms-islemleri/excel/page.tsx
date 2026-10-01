import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsIslemleriVeri } from '@/lib/sms-islemleri-data'
import SmsExcelClient from '@/components/iletisim/SmsExcelClient'
import { smsExcelGonderAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function SmsExcelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const veri = await fetchSmsIslemleriVeri(supabase)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <span className="text-slate-400">İletişim Yönetimi</span>
        <span className="text-slate-300">/</span>
        <Link href="/iletisim-yonetimi/sms-islemleri" className="text-slate-500 hover:text-slate-700">
          SMS İşlemleri
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Excel ile Gönder</span>
      </nav>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Excel ile SMS</h1>
        <p className="text-sm text-slate-500 mt-1">
          Listeyi yükleyin, sütunları seçin, gidecek metinleri kontrol edin, sonra gönderin.
        </p>
      </div>

      {!veri.gonderimAcik && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          SMS gönderimi için ayarlar eksik veya pasif. Önizleme yapılabilir; gönderim ayarlar tamamlanınca açılır.
        </div>
      )}

      <SmsExcelClient
        originatorlar={veri.originatorlar}
        sablonlar={veri.sablonlar.map(s => ({ id: s.id, baslik: s.baslik, metin: s.metin }))}
        gonderimAcik={veri.gonderimAcik}
        onGonder={smsExcelGonderAction}
      />
    </div>
  )
}
