import { fetchAllFirmaCalisanlar } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail, godmodeSicilSet } from '@/lib/godmode-calisan'
import { isFirmaCalisanAktif } from '@/lib/firma-calisan-durum'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
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

  const [{ data: calisanlarRaw }, { data: kadroOzet }, { data: phRaw }, { data: profiller }, { data: firmaRaw }] =
    await Promise.all([
      supabase.from('calisan').select('sicil_no, ad_soyad').order('sicil_no'),
      supabase
        .from('personel_kadro_ozet')
        .select('sicil_no, ad_soyad, gorev_unvani, gorev_mudurlugu, statu')
        .order('sicil_no'),
      supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
      supabase.from('app_profiles').select('id, sicil_no, rol, menu_izinleri, hesap_aktif').eq('profil_turu', 'personel'),
      fetchAllFirmaCalisanlar(supabase, 'sicil_no, ad_soyad, gorevi, gorev_mudurlugu, ayrilis_tarihi, e_posta'),
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

  const aktifKadroSiciller = [...aktifSiciller]

  const kadroPersonel = aktifKadroSiciller
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

  const kadroSicilSet = new Set(aktifKadroSiciller)
  const god = godmodeSicilSet()

  const firmaAktif = filterOutHiddenSystemByEmail(firmaRaw ?? []).filter(f => {
    const sicil = f.sicil_no?.trim()
    if (!sicil) return false
    if (!isFirmaCalisanAktif(f.ayrilis_tarihi)) return false
    if (kadroSicilSet.has(sicil)) return false
    return true
  })

  const firmaEk = firmaAktif
    .filter(f => !god.has(f.sicil_no!.trim()))
    .map(f => {
      const s = f.sicil_no!.trim()
      const c = calisanMap.get(s)
      return {
        sicil_no: s,
        ad_soyad: c?.ad_soyad ?? f.ad_soyad,
        gorev_unvani: f.gorevi ?? null,
        gorev_mudurlugu: f.gorev_mudurlugu ?? null,
      }
    })

  const profilMap = new Map(
    (profiller ?? []).filter(p => p.rol !== 'dis_denetci' && p.sicil_no).map(p => [p.sicil_no!, p]),
  )

  // ADABEL sicilleri "A" önekli; kadro sicillerinden sonra sayısal sıraya yerleşsinler.
  const sicilSiraDeger = (s: string) => {
    const m = s.match(/^A(\d+)/i)
    if (m) return 1_000_000_000 + (parseInt(m[1], 10) || 0)
    return parseInt(s, 10) || 0
  }
  const birlesik = [...kadroPersonel, ...firmaEk].sort(
    (a, b) => sicilSiraDeger(a.sicil_no) - sicilSiraDeger(b.sicil_no),
  )

  const satirlar = birlesik.map(m => {
    const p = profilMap.get(m.sicil_no)
    return {
      ...m,
      profil: p && (p.rol === 'admin' || p.rol === 'kullanici')
        ? { id: p.id, rol: p.rol, menu_izinleri: p.menu_izinleri, hesap_aktif: p.hesap_aktif }
        : null,
    }
  })

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'app_profiles',
    satirlar.map(s => s.sicil_no),
  )

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span className="text-slate-800 font-medium">Çalışan Yetkilendirme</span>
      </nav>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Çalışan Yetkilendirme</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Aktif belediye personeli (tüm statüler) + <strong>ADABEL Personeli</strong> çalışanlar sekmesindeki aktif kayıtlar,
          sicil sırasıyla · Toplam{' '}
          <span className="font-semibold">{satirlar.length}</span> satır
        </p>
      </div>

      <YetkilendirmeClient satirlar={satirlar} auditLoglarByRefId={auditLoglarByRefId} />
    </div>
  )
}
