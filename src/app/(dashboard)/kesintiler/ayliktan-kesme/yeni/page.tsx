import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import AyliktanKesmeClient from '@/components/kesintiler/AyliktanKesmeClient'
import { ayliktanKesmeAdaylari } from '@/lib/ayliktan-kesme-yukle'
import { ayliktanKesmeKaydet, ayliktanKesmePersonelGetir } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AyliktanKesmeYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const izinli =
    !!access &&
    (isAdminLike(access) ||
      (access.mode === 'kullanici' &&
        kullaniciPathAllowed('/kesintiler/ayliktan-kesme', access.sicilNo, access.menuIzinleri)))
  const { adaylar, hata } = izinli
    ? await ayliktanKesmeAdaylari(supabase)
    : { adaylar: [], hata: undefined as string | undefined }

  return (
    <div>
      <Link
        href="/kesintiler/ayliktan-kesme"
        className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
      >
        ← Aylıktan Kesme İşlemleri
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Bordro Oluştur</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Derece ve kademe asıl terfinin KHA’sından, ek gösterge, ÖHT ve yan ödeme kazanç tanımından gelir. Kıdem yılı terfi
        kaydındadır. Yarı zamanlı personelde yönetmelik gereği ödeme unsurlarının yarısı esas alınır.
      </p>
      {hata ? (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>
      ) : (
        <AyliktanKesmeClient
          adaylar={adaylar}
          personelGetir={ayliktanKesmePersonelGetir}
          kaydet={ayliktanKesmeKaydet}
        />
      )}
    </div>
  )
}
