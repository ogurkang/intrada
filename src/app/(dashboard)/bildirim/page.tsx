import { createClient } from '@/lib/supabase/server'
import ModulHubClient from '@/components/ui/ModulHubClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarByRefTables, hubSonIslemFromLogs, type ModulHubAuditTip } from '@/lib/hub-audit-load'

const BILDIRIM_REF_TABLES = ['calisan_ogrenim', 'aile_bildirimi', 'mal_bildirimi'] as const

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

  const [
    { count: ogrenimSayisi },
    { count: aileSayisi },
    { count: malSayisi },
    auditLoglarByRefTable,
  ] = await Promise.all([
    supabase.from('calisan_ogrenim').select('*', { count: 'exact', head: true }),
    aileCountQ,
    malCountQ,
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
  ]

  return (
    <ModulHubClient
      baslik="Bildirim Modülü"
      aciklama="Öğrenim, aile ve mal bildirimleri yönetimi. Kartlarda son işlem kaydı gösterilir; saat simgesiyle tüm geçmişe erişebilirsiniz."
      gridClassName="grid grid-cols-1 md:grid-cols-3 gap-5"
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
