import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

// Supabase ile çalışan sayfalar statik prerender edilemez
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { ensureAppProfileForAuthUser, type AppProfileEnsure } from '@/lib/app-profile-ensure'
import IlkKurulumGuard from '@/components/auth/IlkKurulumGuard'
import { loadDenetimSidebarAgac } from '@/lib/denetim-menu'
import { loadKysSidebarAgac } from '@/lib/kys-menu'
import { tasinirGorevlendirmeMenuAcikMi } from '@/lib/uygulama-ayar'
import { thHizmetYiliMenuAcikMi } from '@/lib/th-hizmet-yili-data'
import {
  loadDashboardUserShell,
  loadPerformansDegerlendirmeHrefCached,
} from '@/lib/dashboard-shell-cache'
import { kullaniciAdiDuyurusuCoz } from '@/lib/kullanici-adi'
import { KullaniciAdiGirisDuyuru } from '@/components/auth/KullaniciAdiGirisDuyuru'
import YoneticiGelistirmeDuyuru from '@/components/layout/YoneticiGelistirmeDuyuru'

async function karsilamaAdCoz(
  access: AppAccess,
  profil: AppProfileEnsure,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string | null> {
  if (access.mode === 'dis_denetci') {
    return (access.adSoyad || profil.ad_soyad || '').trim() || null
  }
  if (access.mode === 'kullanici') {
    const sn = access.sicilNo.trim()
    if (!sn) return null
    const { data: cal } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', sn).maybeSingle()
    return (cal?.ad_soyad ?? '').trim() || null
  }
  return null
}

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

  // Profil + yetki + karşılama: ~90 sn önbellek (menü gezintisinde tekrar DB yok)
  const cached = await loadDashboardUserShell(user)
  let profil = cached.profil
  let access = cached.access
  let kullaniciKarsilamaAd = cached.kullaniciKarsilamaAd

  // Önbellekte profil yoksa: oluştur / taze oku (null’u 90 sn kilitlememek için cache’e güvenme)
  if (!profil) {
    profil = await ensureAppProfileForAuthUser(supabase, user)
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
    access = await getAppAccess(supabase, user.id)
    kullaniciKarsilamaAd = await karsilamaAdCoz(access, profil, supabase)
    // null kabuk önbelleğini düşür; sonraki gezintide dolu kabuk cache’lensin
    revalidateTag(`dashboard-user-${user.id}`, { expire: 0 })
  }

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

  const headerKimlik =
    access.mode === 'dis_denetci'
      ? kullaniciKarsilamaAd || access.kullaniciAdi || undefined
      : user.email

  const buildSha =
    process.env.NEXT_PUBLIC_BUILD_MARKER ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_COMMIT_SHA?.slice(0, 7) ??
    'local-dev'

  const [denetimAgac, kysAgac, tasinirGorevlendirmeMenuAcik, thHizmetYiliMenuAcik, performansDegerlendirmeHref] =
    await Promise.all([
      loadDenetimSidebarAgac(),
      loadKysSidebarAgac(),
      tasinirGorevlendirmeMenuAcikMi(supabase),
      thHizmetYiliMenuAcikMi(),
      loadPerformansDegerlendirmeHrefCached(access, Boolean(hayaletDurum?.aktif)),
    ])

  let girisDuyurusu: 'degisti' | 'ipucu' | null = null
  let girisDuyuruAdi = ''
  if (ilkTamam && access.mode !== 'dis_denetci' && 'kurtarmaHash' in access) {
    const ad = (access.kullaniciAdi ?? '').trim()
    const tur = kullaniciAdiDuyurusuCoz(access.kurtarmaHash)
    if (ad && tur) {
      girisDuyurusu = tur
      girisDuyuruAdi = ad
    }
  }

  return (
    <IlkKurulumGuard ilkKurulumTamam={ilkTamam}>
      {girisDuyurusu ? (
        <KullaniciAdiGirisDuyuru tur={girisDuyurusu} kullaniciAdi={girisDuyuruAdi} />
      ) : null}
      {ilkTamam && isAdminLike(access) ? (
        <YoneticiGelistirmeDuyuru adminMi kullaniciId={user.id} />
      ) : null}
      <DashboardShell
        userEmail={headerKimlik}
        kullaniciKarsilamaAd={kullaniciKarsilamaAd}
        access={access}
        hayaletDurum={hayaletDurum}
        buildMarker={buildSha}
        denetimAgac={denetimAgac}
        kysAgac={kysAgac}
        tasinirGorevlendirmeMenuAcik={tasinirGorevlendirmeMenuAcik}
        thHizmetYiliMenuAcik={thHizmetYiliMenuAcik}
        performansDegerlendirmeHref={performansDegerlendirmeHref}
      >
        {children}
      </DashboardShell>
    </IlkKurulumGuard>
  )
}
