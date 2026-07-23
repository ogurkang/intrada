import { createClient } from '@/lib/supabase/server'

// Supabase ile çalışan sayfalar statik prerender edilemez
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { ensureAppProfileForAuthUser } from '@/lib/app-profile-ensure'
import IlkKurulumGuard from '@/components/auth/IlkKurulumGuard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profil = await ensureAppProfileForAuthUser(supabase, user)

  if (!profil) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-amber-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-amber-900 font-medium">E-posta eşleşmesi bulunamadı</p>
          <p className="mt-2 text-sm text-slate-600">
            Giriş yaptığınız e-posta, <code className="bg-slate-100 px-1 rounded">calisan</code> kaydındaki
            e-posta ile aynı değil. Personel kaydında e-posta güncellenmesi veya yönetici ile iletişim gerekir.
          </p>
        </div>
      </div>
    )
  }

  const access = await getAppAccess(supabase, user.id)
  const hayaletDurum = await hayaletProfilDurumCoz(supabase, access)
  if (access.mode === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-red-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-red-900 font-medium">Sistem erişiminiz kapatılmıştır</p>
          <p className="mt-2 text-sm text-slate-600">
            Hesabınız için giriş yetkisi yönetici tarafından pasife alınmıştır. Açtırmak için yetkili yönetici ile iletişime geçin.
          </p>
        </div>
      </div>
    )
  }
  const ilkTamam = profil.ilk_giris_tamam

  let kullaniciKarsilamaAd: string | null = null
  const sn = 'sicilNo' in access ? access.sicilNo.trim() : ''
  if (sn) {
    const { data: cal } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', sn).maybeSingle()
    kullaniciKarsilamaAd = (cal?.ad_soyad ?? '').trim() || null
  }

  const buildSha =
    process.env.NEXT_PUBLIC_BUILD_MARKER ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_COMMIT_SHA?.slice(0, 7) ??
    'local-dev'

  return (
    <IlkKurulumGuard ilkKurulumTamam={ilkTamam}>
      <DashboardShell
        userEmail={user.email}
        kullaniciKarsilamaAd={kullaniciKarsilamaAd}
        access={access}
        hayaletDurum={hayaletDurum}
        buildMarker={buildSha}
      >
        {children}
      </DashboardShell>
    </IlkKurulumGuard>
  )
}
