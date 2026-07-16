import { createClient } from '@/lib/supabase/server'
import ModulHubClient from '@/components/ui/ModulHubClient'
import { loadAuditLoglarByRefTables, hubSonIslemFromLogs } from '@/lib/hub-audit-load'

const TANIMLAR = [
  {
    key: 'degerlendirme',
    kod: 'PRF',
    baslik: 'Değerlendirme',
    aciklama: 'Performans dönemi açma, müdürlük bazlı takip ve 1./2. amir puanlama',
    href: '/performans/degerlendirme',
    renk: 'border-indigo-200 bg-indigo-50',
    ikonRenk: 'bg-indigo-100 text-indigo-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    key: 'raporlama',
    kod: 'RPR',
    baslik: 'Raporlama',
    aciklama: 'Düşük puanlı personel listesi ve yönetmelik belgeleri',
    href: '/performans/raporlama',
    renk: 'border-amber-200 bg-amber-50',
    ikonRenk: 'bg-amber-100 text-amber-600',
    birim: 'rapor',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    key: 'tanimlar',
    kod: 'TNM',
    baslik: 'Tanımlar',
    aciklama: 'Performans kriterleri ve 2. amir SMS şablonu',
    href: '/performans/tanimlar',
    renk: 'border-slate-200 bg-slate-50',
    ikonRenk: 'bg-slate-200 text-slate-600',
    birim: 'tanım',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
] as const

export default async function PerformansHubPage() {
  const supabase = await createClient()
  const buYil = new Date().getFullYear()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const auditLoglarByRefTable = await loadAuditLoglarByRefTables(supabase, ['performans_donem'])
  const auditLoglar = auditLoglarByRefTable['performans_donem'] ?? []

  const [{ count: acik }, { count: toplamYil }, { count: degSayisi }] = await Promise.all([
    db.from('performans_donem').select('id', { count: 'exact', head: true }).eq('durum', 'Açık'),
    db.from('performans_donem').select('id', { count: 'exact', head: true }).eq('yil', buYil),
    db.from('performans_degerlendirme').select('id', { count: 'exact', head: true }),
  ])

  const kartlar = TANIMLAR.map(t => {
    if (t.key === 'degerlendirme') {
      return {
        key: t.key,
        kod: t.kod,
        baslik: t.baslik,
        aciklama: t.aciklama,
        href: t.href,
        renk: t.renk,
        ikonRenk: t.ikonRenk,
        ikon: t.ikon,
        sayi: toplamYil ?? 0,
        altMetin: `${buYil} yılı · ${t.birim}`,
        badge: (acik ?? 0) > 0 ? `${acik} açık` : null,
        sonIslem: hubSonIslemFromLogs(auditLoglar),
        auditLoglar,
        auditTip: 'kesinti-donem' as const,
        gecmisBaslik: `Dönem Geçmişi — ${t.baslik}`,
      }
    }
    if (t.key === 'raporlama') {
      return {
        key: t.key,
        kod: t.kod,
        baslik: t.baslik,
        aciklama: t.aciklama,
        href: t.href,
        renk: t.renk,
        ikonRenk: t.ikonRenk,
        ikon: t.ikon,
        sayi: degSayisi ?? 0,
        altMetin: 'toplam değerlendirme kaydı',
        badge: null,
        sonIslem: null,
        auditLoglar: [],
      }
    }
    return {
      key: t.key,
      kod: t.kod,
      baslik: t.baslik,
      aciklama: t.aciklama,
      href: t.href,
      renk: t.renk,
      ikonRenk: t.ikonRenk,
      ikon: t.ikon,
      sayi: '—',
      altMetin: t.birim,
      badge: null,
      sonIslem: null,
      auditLoglar: [],
    }
  })

  return (
    <ModulHubClient
      baslik="Performans Yönetimi"
      aciklama="Memur yetkinlik bazlı performans değerlendirme (PPD yönetmeliği). Kartlarda son işlem gösterilir; saat simgesiyle dönem geçmişine erişebilirsiniz."
      kartlar={kartlar}
      gridClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
    />
  )
}
