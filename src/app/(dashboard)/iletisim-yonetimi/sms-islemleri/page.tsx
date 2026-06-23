import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchSmsAyar, smsAyarHazirMi } from '@/lib/sms-ayar'

export const dynamic = 'force-dynamic'

const KARTLAR: {
  href: string
  baslik: string
  aciklama: string
  ikon: string
  renk: string
  ikonRenk: string
}[] = [
  {
    href: '/iletisim-yonetimi/sms-islemleri/dogum-gunu',
    baslik: 'Doğum Günü',
    aciklama: 'Seçilen aydaki personele, doğum gününde iletilmek üzere şablon mesajı planlayın.',
    ikon: '🎂',
    renk: 'border-pink-200 bg-pink-50 hover:border-pink-300',
    ikonRenk: 'bg-pink-100',
  },
  {
    href: '/iletisim-yonetimi/sms-islemleri/hos-geldin-bebek',
    baslik: 'Hoş Geldin Bebek',
    aciklama: 'Yeni bebeği olan çalışanlara tebrik mesajı gönderin (ay veya son X güne göre).',
    ikon: '👶',
    renk: 'border-sky-200 bg-sky-50 hover:border-sky-300',
    ikonRenk: 'bg-sky-100',
  },
  {
    href: '/iletisim-yonetimi/sms-islemleri/tekil',
    baslik: 'Tekil Mesajlar',
    aciklama: 'Personel veya manuel numaralara serbest/şablonlu mesaj gönderin.',
    ikon: '✉️',
    renk: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    ikonRenk: 'bg-emerald-100',
  },
  {
    href: '/iletisim-yonetimi/sms-islemleri/grup',
    baslik: 'Grup Mesajları',
    aciklama: 'Grup oluşturup içine personel ekleyin ve gruba toplu mesaj gönderin.',
    ikon: '👥',
    renk: 'border-violet-200 bg-violet-50 hover:border-violet-300',
    ikonRenk: 'bg-violet-100',
  },
]

export default async function SmsIslemleriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const ayar = await fetchSmsAyar(supabase)
  const hazir = smsAyarHazirMi(ayar)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span className="text-slate-400">İletişim Yönetimi</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">SMS İşlemleri</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SMS İşlemleri</h1>
          <p className="text-sm text-slate-500 mt-1">
            İşlem türünü seçin. Şablon ve gönderici başlığı her ekranda seçilebilir.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/iletisim-yonetimi/gecmis-gonderimler"
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Geçmiş Gönderimler
          </Link>
          <Link
            href="/iletisim-yonetimi/tanimlar"
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            SMS Ayarları
          </Link>
        </div>
      </div>

      {!hazir && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          SMS gönderimi için ayarlar eksik veya pasif.{' '}
          <Link href="/iletisim-yonetimi/tanimlar" className="font-medium underline">
            Tanımlar ekranından
          </Link>{' '}
          API bilgilerini tamamlayın.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KARTLAR.map(k => (
          <Link
            key={k.href}
            href={k.href}
            className={`block rounded-xl border-2 p-5 transition-all hover:shadow-md ${k.renk}`}
          >
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${k.ikonRenk}`}>
              {k.ikon}
            </span>
            <h2 className="font-semibold text-slate-800">{k.baslik}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mt-1">{k.aciklama}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
