import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { TanimlarSaltOkunurProvider } from '@/components/tanimlar/TanimlarSaltOkunurContext'

export default async function YerelBilgiTanimlarLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const saltOkunur = user ? (await getAppAccess(supabase, user.id)).mode === 'kullanici' : false

  return (
    <TanimlarSaltOkunurProvider value={saltOkunur}>
      {saltOkunur && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tanımlar bu hesap için <strong>salt okunur</strong> görüntülenir; kayıt ekleyemez veya değiştiremezsiniz.
        </div>
      )}
      {children}
    </TanimlarSaltOkunurProvider>
  )
}
