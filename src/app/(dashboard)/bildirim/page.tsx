import { createClient } from '@/lib/supabase/server'
import ModulHubClient from '@/components/ui/ModulHubClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarByRefTables, hubSonIslemFromLogs, type ModulHubAuditTip } from '@/lib/hub-audit-load'

const BILDIRIM_REF_TABLES = [
  'calisan_ogrenim',
  'personel_sendika',
  'aile_bildirimi',
  'mal_bildirimi',
  'pasaport_islemleri',
  'hizmet_birlestirme_islemleri',
  'mehil_izni_bildirimleri',
  'harcirah_talep_bildirimleri',
  'calisma_belgesi_bildirimleri',
  'bes_iptal_bildirimleri',
  'sendika_istifa_bildirimleri',
] as const

export default async function BildirimHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciSicil = !isAdminLike(access) && access.mode === 'kullanici' ? access.sicilNo : null

  const aileCountQ = kullaniciSicil
    ? supabase.from('aile_bildirimi').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('aile_bildirimi').select('*', { count: 'exact', head: true })
  const malCountQ = kullaniciSicil
    ? supabase.from('mal_bildirimi').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('mal_bildirimi').select('*', { count: 'exact', head: true })
  const pasaportCountQ = kullaniciSicil
    ? supabase.from('pasaport_islemleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('pasaport_islemleri').select('*', { count: 'exact', head: true })
  const hizmetCountQ = kullaniciSicil
    ? supabase.from('hizmet_birlestirme_islemleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('hizmet_birlestirme_islemleri').select('*', { count: 'exact', head: true })
  const mehilCountQ = kullaniciSicil
    ? supabase.from('mehil_izni_bildirimleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('mehil_izni_bildirimleri').select('*', { count: 'exact', head: true })
  const harcirahCountQ = kullaniciSicil
    ? supabase.from('harcirah_talep_bildirimleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('harcirah_talep_bildirimleri').select('*', { count: 'exact', head: true })
  const calismaBelgesiCountQ = kullaniciSicil
    ? supabase.from('calisma_belgesi_bildirimleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('calisma_belgesi_bildirimleri').select('*', { count: 'exact', head: true })
  const besIptalCountQ = kullaniciSicil
    ? supabase.from('bes_iptal_bildirimleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('bes_iptal_bildirimleri').select('*', { count: 'exact', head: true })
  const sendikaIstifaCountQ = kullaniciSicil
    ? supabase.from('sendika_istifa_bildirimleri').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil)
    : supabase.from('sendika_istifa_bildirimleri').select('*', { count: 'exact', head: true })
  const sendikaCountQ = kullaniciSicil
    ? supabase.from('personel_sendika').select('*', { count: 'exact', head: true }).eq('sicil_no', kullaniciSicil).eq('aktif', true)
    : supabase.from('personel_sendika').select('*', { count: 'exact', head: true }).eq('aktif', true)

  const [
    { count: ogrenimSayisi },
    { count: aileSayisi },
    { count: malSayisi },
    { count: pasaportSayisi },
    { count: hizmetSayisi },
    { count: mehilSayisi },
    { count: harcirahSayisi },
    { count: calismaBelgesiSayisi },
    { count: besIptalSayisi },
    { count: sendikaIstifaSayisi },
    { count: sendikaSayisi },
    auditLoglarByRefTable,
  ] = await Promise.all([
    supabase.from('calisan_ogrenim').select('*', { count: 'exact', head: true }),
    aileCountQ,
    malCountQ,
    pasaportCountQ,
    hizmetCountQ,
    mehilCountQ,
    harcirahCountQ,
    calismaBelgesiCountQ,
    besIptalCountQ,
    sendikaIstifaCountQ,
    sendikaCountQ,
    loadAuditLoglarByRefTables(supabase, [...BILDIRIM_REF_TABLES]),
  ])

  const kartlar = [
    {
      key: 'ogrenim',
      baslik: 'Öğrenim Bildirimi',
      aciklama: 'Personel öğrenim ve diploma kayıtları',
      href: '/bildirim/ogrenim',
      refTable: 'calisan_ogrenim' as const,
      sayi: ogrenimSayisi ?? 0,
      birim: 'kayıt',
      renk: 'border-blue-200 bg-blue-50',
      ikonRenk: 'bg-blue-100 text-blue-600',
      auditTip: 'ogrenim' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
    },
    {
      key: 'aile',
      baslik: 'Aile Bildirimi',
      aciklama: 'Medeni hal, eş ve çocuk bilgileri',
      href: '/bildirim/aile',
      refTable: 'aile_bildirimi' as const,
      sayi: aileSayisi ?? 0,
      birim: 'kayıt',
      renk: 'border-green-200 bg-green-50',
      ikonRenk: 'bg-green-100 text-green-600',
      auditTip: 'aile' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      key: 'mal',
      baslik: 'Mal Bildirimi',
      aciklama: 'Taşınmaz, taşıt, banka ve diğer servet bilgileri',
      href: '/bildirim/mal',
      refTable: 'mal_bildirimi' as const,
      sayi: malSayisi ?? 0,
      birim: 'beyan',
      renk: 'border-amber-200 bg-amber-50',
      ikonRenk: 'bg-amber-100 text-amber-600',
      auditTip: 'mal' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      key: 'pasaport',
      baslik: 'Pasaport İşlemleri',
      aciklama: 'Yeşil pasaport başvuru formu oluşturma ve Word çıktısı',
      href: '/bildirim/pasaport',
      refTable: 'pasaport_islemleri' as const,
      sayi: pasaportSayisi ?? 0,
      birim: 'form',
      renk: 'border-violet-200 bg-violet-50',
      ikonRenk: 'bg-violet-100 text-violet-600',
      auditTip: 'pasaport' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      ),
    },
    {
      key: 'hizmet-birlestirme',
      baslik: 'Hizmet Birleştirme İşlemleri',
      aciklama: 'SGK hizmet birleştirme dilekçesi oluşturma ve Word çıktısı',
      href: '/bildirim/hizmet-birlestirme',
      refTable: 'hizmet_birlestirme_islemleri' as const,
      sayi: hizmetSayisi ?? 0,
      birim: 'form',
      renk: 'border-sky-200 bg-sky-50',
      ikonRenk: 'bg-sky-100 text-sky-600',
      auditTip: 'hizmet-birlestirme' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      key: 'mehil-izni',
      baslik: 'Mehil İzni Bildirimi',
      aciklama: '657 SK m.62 mehil izni bildirimi oluşturma ve Word çıktısı',
      href: '/bildirim/mehil-izni',
      refTable: 'mehil_izni_bildirimleri' as const,
      sayi: mehilSayisi ?? 0,
      birim: 'form',
      renk: 'border-teal-200 bg-teal-50',
      ikonRenk: 'bg-teal-100 text-teal-600',
      auditTip: 'mehil-izni' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      key: 'harcirah-talep',
      baslik: 'Harcırah Talep Bildirimi',
      aciklama: '6245 SK harcırah talep bildirimi oluşturma ve Word çıktısı',
      href: '/bildirim/harcirah-talep',
      refTable: 'harcirah_talep_bildirimleri' as const,
      sayi: harcirahSayisi ?? 0,
      birim: 'form',
      renk: 'border-rose-200 bg-rose-50',
      ikonRenk: 'bg-rose-100 text-rose-600',
      auditTip: 'harcirah-talep' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'calisma-belgesi',
      baslik: 'Çalışma Belgesi İşlemleri',
      aciklama: 'Çalışma belgesi talep dilekçesi oluşturma ve Word çıktısı',
      href: '/bildirim/calisma-belgesi',
      refTable: 'calisma_belgesi_bildirimleri' as const,
      sayi: calismaBelgesiSayisi ?? 0,
      birim: 'form',
      renk: 'border-indigo-200 bg-indigo-50',
      ikonRenk: 'bg-indigo-100 text-indigo-600',
      auditTip: 'calisma-belgesi' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      key: 'bes-iptal',
      baslik: 'BES İptal İşlemleri',
      aciklama: 'BES/OKS iptal talep dilekçesi oluşturma ve Word çıktısı',
      href: '/bildirim/bes-iptal',
      refTable: 'bes_iptal_bildirimleri' as const,
      sayi: besIptalSayisi ?? 0,
      birim: 'form',
      renk: 'border-orange-200 bg-orange-50',
      ikonRenk: 'bg-orange-100 text-orange-600',
      auditTip: 'bes-iptal' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'sendika',
      baslik: 'Sendika Bildirimi',
      aciklama: 'Personel sendika üyelik değişiklikleri',
      href: '/bildirim/sendika',
      refTable: 'personel_sendika' as const,
      sayi: sendikaSayisi ?? 0,
      birim: 'aktif kayıt',
      renk: 'border-purple-200 bg-purple-50',
      ikonRenk: 'bg-purple-100 text-purple-600',
      auditTip: 'sendika' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'sendika-istifa',
      baslik: 'Sendika İstifa İşlemleri',
      aciklama: 'Sendika istifa bildirimi dilekçesi oluşturma ve Word çıktısı',
      href: '/bildirim/sendika-istifa',
      refTable: 'sendika_istifa_bildirimleri' as const,
      sayi: sendikaIstifaSayisi ?? 0,
      birim: 'form',
      renk: 'border-fuchsia-200 bg-fuchsia-50',
      ikonRenk: 'bg-fuchsia-100 text-fuchsia-600',
      auditTip: 'sendika-istifa' as ModulHubAuditTip,
      ikon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
  ]

  return (
    <ModulHubClient
      baslik="Bildirim Modülü"
      aciklama="Öğrenim, sendika, aile, mal bildirimleri, pasaport, hizmet birleştirme, mehil izni, harcırah talep, çalışma belgesi, BES iptal ve sendika istifa işlemleri. Kartlarda son işlem kaydı gösterilir; saat simgesiyle tüm geçmişe erişebilirsiniz."
      gridClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      kartlar={kartlar.map(k => {
        const auditLoglar = auditLoglarByRefTable[k.refTable] ?? []
        return {
          key: k.key,
          baslik: k.baslik,
          aciklama: k.aciklama,
          href: k.href,
          renk: k.renk,
          ikonRenk: k.ikonRenk,
          ikon: k.ikon,
          sayi: k.sayi,
          altMetin: k.birim,
          sonIslem: hubSonIslemFromLogs(auditLoglar),
          auditLoglar,
          auditTip: k.auditTip,
          gecmisBaslik: `İşlem Geçmişi — ${k.baslik}`,
        }
      })}
    />
  )
}
