import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { EPOSTA_VARSAYILAN, epostaAyarHazirMi, fetchEpostaAyar } from '@/lib/eposta-ayar'
import { epostaImzaOlustur } from '@/lib/eposta-imza'
import EpostaIslemleriClient from '@/components/iletisim/EpostaIslemleriClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function EpostaIslemleriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  if (!isAdminLike(access)) notFound()

  const ayar = await fetchEpostaAyar(supabase)
  const imza = user ? await epostaImzaOlustur(supabase, user.id, ayar?.imza_metin ?? '') : null

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span className="text-slate-400">İletişim Yönetimi</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">E-posta İşlemleri</span>
      </nav>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">E-posta İşlemleri</h1>
        <p className="text-sm text-slate-500 mt-1">
          {ayar?.gorunen_ad || EPOSTA_VARSAYILAN.gorunenAd} · {ayar?.adres || EPOSTA_VARSAYILAN.adres}
        </p>
      </div>
      {!ayar && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          E-posta tablosu henüz yok.{' '}
          <span className="font-medium">20261019160000_iletisim_eposta.sql</span> dosyasını SQL editöründe çalıştırın.{' '}
          <Link href="/iletisim-yonetimi/tanimlar" className="underline">
            Tanımlar
          </Link>
        </div>
      )}
      <EpostaIslemleriClient
        hazir={epostaAyarHazirMi(ayar)}
        imza={imza?.metin ?? ''}
        adres={ayar?.adres || EPOSTA_VARSAYILAN.adres}
      />
    </div>
  )
}
