import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PerformansProgramiVeriGirisFaaliyetDetayClient, {
  type PpVeriGirisSatir,
} from '@/components/stratejik/PerformansProgramiVeriGirisFaaliyetDetayClient'
import { performansVeriGirisKaydet } from '../../../actions'

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export default async function PerformansProgramiVeriGirisFaaliyetDetayPage({
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

  const { data: gostergeRaw } = await sb
    .from('stratejik_plan_gosterge')
    .select('id, sira_no, gosterge_adi, birim, yil_1, yil_2, yil_3, yil_4, yil_5')
    .eq('faaliyet_id', faaliyetId)
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  const { data: veriRows } = await sb
    .from('performans_programi_veri_giris')
    .select('gosterge_id, birim, onceki_yil_gerceklesme, planlanan_cari_yil, gerceklesme_tahmini_cari_yil, tahmin_sonraki_yil_1, tahmin_sonraki_yil_2, tahmin_sonraki_yil_3, gosterge_aciklama, hesaplama_yontemi')
    .eq('faaliyet_id', faaliyetId)
    .eq('yil', yil)
    .eq('mudurluk', mudurluk)
  type VeriGirisRow = {
    gosterge_id?: number
    birim?: string
    onceki_yil_gerceklesme?: number
    planlanan_cari_yil?: number
    gerceklesme_tahmini_cari_yil?: number
    tahmin_sonraki_yil_1?: number
    tahmin_sonraki_yil_2?: number
    tahmin_sonraki_yil_3?: number
    gosterge_aciklama?: string
    hesaplama_yontemi?: string
  }
  const veriByGosterge = new Map<number, VeriGirisRow>(
    (veriRows ?? []).map((r: VeriGirisRow) => [Number(r.gosterge_id), r]),
  )

  const satirlar: PpVeriGirisSatir[] = (gostergeRaw ?? []).map((g: { id?: number; sira_no?: number; gosterge_adi?: string; birim?: string; yil_1?: number; yil_2?: number; yil_3?: number; yil_4?: number; yil_5?: number }) => {
    const gid = Number(g.id)
    const v = veriByGosterge.get(gid)
    return {
      gosterge_id: gid,
      sira_no: Number.isFinite(Number(g.sira_no)) ? Number(g.sira_no) : null,
      gosterge_adi: String(g.gosterge_adi ?? ''),
      birim: String(v?.birim ?? g.birim ?? ''),
      onceki_yil_gerceklesme: v?.onceki_yil_gerceklesme ?? (Number.isFinite(Number(g.yil_1)) ? Number(g.yil_1) : null),
      cari_yil_planlanan: v?.planlanan_cari_yil ?? (Number.isFinite(Number(g.yil_2)) ? Number(g.yil_2) : null),
      cari_yil_gerceklesme_tahmini: v?.gerceklesme_tahmini_cari_yil ?? (Number.isFinite(Number(g.yil_3)) ? Number(g.yil_3) : null),
      sonraki_yil_tahmin_1: v?.tahmin_sonraki_yil_1 ?? (Number.isFinite(Number(g.yil_4)) ? Number(g.yil_4) : null),
      sonraki_yil_tahmin_2: v?.tahmin_sonraki_yil_2 ?? (Number.isFinite(Number(g.yil_5)) ? Number(g.yil_5) : null),
      sonraki_yil_tahmin_3: v?.tahmin_sonraki_yil_3 ?? null,
      gosterge_aciklama: String(v?.gosterge_aciklama ?? ''),
      hesaplama_yontemi: String(v?.hesaplama_yontemi ?? ''),
    }
  })

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: `${yil} Veri Giriş`, href: `/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris` },
          { label: 'Göstergeler' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{String((faaliyet as { faaliyet_adi?: string }).faaliyet_adi ?? `Faaliyet #${faaliyetId}`)}</h1>
        <p className="text-sm text-slate-500 mt-1">Faaliyete bağlı göstergeler listesi</p>
      </div>

      <PerformansProgramiVeriGirisFaaliyetDetayClient
        yil={yil}
        faaliyetId={faaliyetId}
        satirlar={satirlar}
        onKaydet={performansVeriGirisKaydet}
      />
    </div>
  )
}
