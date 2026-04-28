import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PerformansProgramiVeriGirisButceClient, {
  type PpButceDetaySatir,
} from '@/components/stratejik/PerformansProgramiVeriGirisButceClient'
import { performansFaaliyetButceKaydet } from '../../../../actions'

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export default async function PerformansProgramiVeriGirisButcePage({
  params,
}: {
  params: Promise<{ donem_id: string; faaliyet_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(faaliyetId)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') notFound()
  const adminLike = isAdminLike(access)
  const km = access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set((adminLike ? [] : km.mudurlukler).map(normMud))

  const { data: faaliyet } = await sb
    .from('stratejik_plan_faaliyet')
    .select('id, faaliyet_adi, alt_hedef_id')
    .eq('id', faaliyetId)
    .maybeSingle()
  if (!faaliyet) notFound()
  const { data: alt } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('id, mudurluk')
    .eq('id', Number((faaliyet as { alt_hedef_id?: number }).alt_hedef_id))
    .maybeSingle()
  const mudurluk = String((alt as { mudurluk?: string } | null)?.mudurluk ?? '')
  if (!adminLike && !izinMudSet.has(normMud(mudurluk))) notFound()

  const { data: kodRaw } = await sb
    .from('performans_programi_butce_kodu')
    .select('id, adim_1, adim_2, adim_3, adim_4, ekonomik_kod, hesap_adi')
    .in('adim_1', ['03', '05', '06'])
    .order('ekonomik_kod', { ascending: true })
  const kodIds = (kodRaw ?? []).map((k: { id?: number }) => Number(k.id)).filter(Number.isFinite)
  const { data: girisRaw } = kodIds.length
    ? await sb
      .from('performans_programi_faaliyet_butce')
      .select('butce_kodu_id, cari_yil_butce, cari_yil_haziran_sonu, cari_yil_yil_sonu_tahmin, sonraki_yil_butce_1, sonraki_yil_butce_2, sonraki_yil_butce_3')
      .eq('faaliyet_id', faaliyetId)
      .eq('yil', yil)
      .eq('mudurluk', mudurluk)
      .in('butce_kodu_id', kodIds)
    : { data: [] }

  const girisByKod = new Map<number, { cari_yil_butce?: number; cari_yil_haziran_sonu?: number; cari_yil_yil_sonu_tahmin?: number; sonraki_yil_butce_1?: number; sonraki_yil_butce_2?: number; sonraki_yil_butce_3?: number }>(
    (girisRaw ?? []).map((r: { butce_kodu_id?: number; cari_yil_butce?: number; cari_yil_haziran_sonu?: number; cari_yil_yil_sonu_tahmin?: number; sonraki_yil_butce_1?: number; sonraki_yil_butce_2?: number; sonraki_yil_butce_3?: number }) => [Number(r.butce_kodu_id), r]),
  )

  const satirlar: PpButceDetaySatir[] = (kodRaw ?? []).map((k: { id?: number; adim_1?: string; adim_2?: string; adim_3?: string; adim_4?: string; ekonomik_kod?: string; hesap_adi?: string }) => {
    const gid = girisByKod.get(Number(k.id))
    return {
      butce_kodu_id: Number(k.id),
      adim_1: String(k.adim_1 ?? ''),
      adim_2: String(k.adim_2 ?? ''),
      adim_3: String(k.adim_3 ?? ''),
      adim_4: String(k.adim_4 ?? ''),
      ekonomik_kod: String(k.ekonomik_kod ?? ''),
      hesap_adi: String(k.hesap_adi ?? ''),
      cari_yil_butce: gid?.cari_yil_butce ?? null,
      cari_yil_haziran_sonu: gid?.cari_yil_haziran_sonu ?? null,
      cari_yil_yil_sonu_tahmin: gid?.cari_yil_yil_sonu_tahmin ?? null,
      sonraki_yil_butce_1: gid?.sonraki_yil_butce_1 ?? null,
      sonraki_yil_butce_2: gid?.sonraki_yil_butce_2 ?? null,
      sonraki_yil_butce_3: gid?.sonraki_yil_butce_3 ?? null,
    }
  })

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: `${yil} Veri Giriş`, href: `/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris` },
          { label: 'Bütçe' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{String((faaliyet as { faaliyet_adi?: string }).faaliyet_adi ?? `Faaliyet #${faaliyetId}`)}</h1>
        <p className="text-sm text-slate-500 mt-1">Faaliyet bütçe kalemleri</p>
      </div>
      <PerformansProgramiVeriGirisButceClient
        yil={yil}
        faaliyetId={faaliyetId}
        satirlar={satirlar}
        onKaydet={performansFaaliyetButceKaydet}
      />
    </div>
  )
}
