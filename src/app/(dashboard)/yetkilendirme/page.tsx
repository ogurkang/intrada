import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import YetkilendirmeClient from './YetkilendirmeClient'

export const dynamic = 'force-dynamic'

export default async function YetkilendirmePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (!isAdminLike(access)) {
    return (
      <div className="max-w-lg">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <span className="text-slate-800 font-medium">Yetkilendirme</span>
        </nav>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="text-amber-900 font-medium">Bu ekran yalnızca yöneticiler içindir.</p>
          <p className="mt-2 text-sm text-amber-800/90">
            Kullanıcı kayıtları ve rol atamaları yöneticiler tarafından bu modülde yapılır.
          </p>
        </div>
      </div>
    )
  }

  const [{ data: calisanlarRaw }, { data: kadroOzet }, { data: phRaw }, { data: profiller }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('sicil_no'),
    supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, gorev_unvani, gorev_mudurlugu, statu').order('sicil_no'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase.from('app_profiles').select('id, sicil_no, rol, menu_izinleri'),
  ])

  const calisanlar = filterOutGodmodeCalisan(calisanlarRaw ?? [])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const aktifSiciller = new Set<string>()
  calisanlar.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })

  const calisanMap = new Map((calisanlar ?? []).map(c => [c.sicil_no, c]))
  const kadroMap = new Map((kadroOzet ?? []).map(k => [k.sicil_no, k]))

  const memurSiciller = [...aktifSiciller].filter(sicil => {
    const k = kadroMap.get(sicil) as { statu?: string } | undefined
    return k?.statu === 'Memur'
  })

  const memurlar = [...memurSiciller]
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
    .map(sicil_no => {
      const c = calisanMap.get(sicil_no)
      const k = kadroMap.get(sicil_no)
      return {
        sicil_no,
        ad_soyad: c?.ad_soyad ?? k?.ad_soyad ?? sicil_no,
        gorev_unvani: k?.gorev_unvani ?? null,
        gorev_mudurlugu: k?.gorev_mudurlugu ?? null,
      }
    })

  const profilMap = new Map((profiller ?? []).map(p => [p.sicil_no, p]))

  const satirlar = memurlar.map(m => ({
    ...m,
    profil: profilMap.get(m.sicil_no) ?? null,
  }))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span className="text-slate-800 font-medium">Yetkilendirme</span>
      </nav>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Yetkilendirme</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Terfi Hareketleri ile aynı personel sırası · Toplam <span className="font-semibold">{satirlar.length}</span>{' '}
          satır
        </p>
      </div>

      <YetkilendirmeClient satirlar={satirlar} />
    </div>
  )
}
