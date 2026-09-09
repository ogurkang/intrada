import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import KazancTasinirYetkiliEkleForm from '@/components/tanimlar/KazancTasinirYetkiliEkleForm'
import { createClient } from '@/lib/supabase/server'
import { KAZANC_TASINIR_LISTE_HREF } from '@/lib/kazanc-tasinir-yetkili'
import { getAppAccess } from '@/lib/app-access'

export default async function KazancTasinirYetkiliEklePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const saltOkunur = user ? (await getAppAccess(supabase, user.id)).mode === 'kullanici' : false
  const { data } = await supabase.from('tanim_kazanc_tasinir_yetkili').select('gorev_adi')
  const mevcutGorevler = (data ?? []).map(r => r.gorev_adi)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tanım Ekle</h1>
          <p className="text-sm text-slate-600 mt-1">
            Taşınır Kayıt Yetkilisi ve Taşınır Kontrol Yetkilisi için kazanç puanı girin.
          </p>
        </div>
        <TanimEkleListeGeriLink href={KAZANC_TASINIR_LISTE_HREF} label="Taşınır yetkilileri listesi" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <KazancTasinirYetkiliEkleForm mevcutGorevler={mevcutGorevler} saltOkunur={saltOkunur} />
      </div>
    </div>
  )
}
