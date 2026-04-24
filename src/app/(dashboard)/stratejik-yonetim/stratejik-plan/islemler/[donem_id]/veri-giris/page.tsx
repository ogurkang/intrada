import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import StratejikPlanVeriGirisClient, { type StratejikVeriRow } from '@/components/stratejik/StratejikPlanVeriGirisClient'
import { stratejikVeriDonemDurumAyarla, stratejikVeriGirisKaydet } from '../../actions'

function normMud(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function tamamlananCeyrek(yil: number): number {
  const now = new Date()
  const simdikiYil = now.getFullYear()
  if (yil < simdikiYil) return 4
  if (yil > simdikiYil) return 0
  return Math.floor(now.getMonth() / 3)
}

export default async function StratejikPlanVeriGirisPage({
  params,
  searchParams,
}: {
  params: Promise<{ donem_id: string }>
  searchParams: Promise<{ ceyrek?: string; mudurluk?: string }>
}) {
  const p = await params
  const s = await searchParams
  const donemId = Number.parseInt(p.donem_id, 10)
  if (!Number.isFinite(donemId)) notFound()

  const supabase = await createClient()
  const { data: donem } = await supabase
    .from('stratejik_plan_donem' as never)
    .select('id, donem_adi, baslangic_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) notFound()

  const baslangicYil = Number(String((donem as { baslangic_tarihi?: string }).baslangic_tarihi ?? '').slice(0, 4))
  const yil = new Date().getFullYear()
  const yilIndex = yil - baslangicYil + 1
  if (yilIndex < 1 || yilIndex > 5) {
    notFound()
  }

  const targetField = `yil_${yilIndex}` as 'yil_1' | 'yil_2' | 'yil_3' | 'yil_4' | 'yil_5'
  const secilenCeyrekRaw = Number.parseInt(String(s.ceyrek ?? '1'), 10)
  const secilenCeyrek = [1, 2, 3, 4].includes(secilenCeyrekRaw) ? secilenCeyrekRaw : 1
  const tamamlanan = tamamlananCeyrek(yil)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') notFound()

  const { data: yetkiRows } = await supabase
    .from('stratejik_plan_veri_giris_yetki_mudurluk' as never)
    .select('mudurluk_adi')
    .eq('aktif', true)
  const yoneticiMudurlukler = (yetkiRows ?? [])
    .map(r => String((r as { mudurluk_adi?: string }).mudurluk_adi ?? '').trim())
    .filter(Boolean)

  const adminLike = isAdminLike(access)
  const km = access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const tumunuGorebilir = adminLike || km.mudurlukler.some(m => yoneticiMudurlukler.some(y => normMud(y) === normMud(m)))
  const donemYonetebilir = tumunuGorebilir

  const [{ data: amacRows }, { data: hedefRows }] = await Promise.all([
    supabase.from('stratejik_plan_amac' as never).select('id').eq('donem_id', donemId),
    supabase.from('stratejik_plan_hedef' as never).select('id, amac_id'),
  ])
  const amacIds = new Set<number>((amacRows ?? []).map(r => Number((r as { id: number }).id)))
  const hedefIds = (hedefRows ?? [])
    .filter(r => amacIds.has(Number((r as { amac_id: number }).amac_id)))
    .map(r => Number((r as { id: number }).id))

  const { data: altRows } = hedefIds.length
    ? await supabase.from('stratejik_plan_alt_hedef' as never).select('id, hedef_id, mudurluk').in('hedef_id', hedefIds)
    : { data: [] as never[] }

  const mudurluklerTum = [...new Set((altRows ?? []).map(r => String((r as { mudurluk?: string }).mudurluk ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'))
  const izinMud = tumunuGorebilir ? mudurluklerTum : mudurluklerTum.filter(m => km.mudurlukler.some(k => normMud(k) === normMud(m)))
  const seciliMudurluk = izinMud.includes(String(s.mudurluk ?? '')) ? String(s.mudurluk) : (izinMud[0] ?? '')

  const altHedefIds = (altRows ?? [])
    .filter(r => normMud(String((r as { mudurluk?: string }).mudurluk ?? '')) === normMud(seciliMudurluk))
    .map(r => Number((r as { id: number }).id))

  const { data: gRows } = altHedefIds.length
    ? await supabase
      .from('stratejik_plan_gosterge' as never)
      .select('id, alt_hedef_id, gosterge_adi, yil_1, yil_2, yil_3, yil_4, yil_5')
      .in('alt_hedef_id', altHedefIds)
      .order('id', { ascending: true })
    : { data: [] as never[] }

  const gostergeIds = (gRows ?? []).map(g => Number((g as { id: number }).id))
  const { data: girisRows } = gostergeIds.length
    ? await supabase
      .from('stratejik_plan_gosterge_gerceklesme' as never)
      .select('gosterge_id, ceyrek, gerceklesen')
      .eq('stratejik_donem_id', donemId)
      .eq('yil', yil)
      .in('gosterge_id', gostergeIds)
    : { data: [] as never[] }

  const qMap = new Map<string, number>()
  for (const r of girisRows ?? []) {
    const gid = Number((r as { gosterge_id: number }).gosterge_id)
    const q = Number((r as { ceyrek: number }).ceyrek)
    const v = Number((r as { gerceklesen?: number }).gerceklesen ?? 0)
    qMap.set(`${gid}:${q}`, Number.isFinite(v) ? v : 0)
  }

  const altMudMap = new Map<number, string>((altRows ?? []).map(a => [Number((a as { id: number }).id), String((a as { mudurluk?: string }).mudurluk ?? '')]))

  const satirlar: StratejikVeriRow[] = (gRows ?? []).map(g => {
    const gid = Number((g as { id: number }).id)
    const altId = Number((g as { alt_hedef_id: number }).alt_hedef_id)
    const q1 = qMap.get(`${gid}:1`) ?? 0
    const q2 = qMap.get(`${gid}:2`) ?? 0
    const q3 = qMap.get(`${gid}:3`) ?? 0
    const q4 = qMap.get(`${gid}:4`) ?? 0
    const yillikToplam = q1 + q2 + q3 + q4
    const hedef = Number((g as Record<string, unknown>)[targetField] ?? 0)
    const gerceklesmeOran = hedef > 0 ? (yillikToplam / hedef) * 100 : null
    return {
      gosterge_id: gid,
      mudurluk: altMudMap.get(altId) ?? '-',
      gosterge_adi: String((g as { gosterge_adi?: string }).gosterge_adi ?? ''),
      hedef: Number.isFinite(hedef) ? hedef : null,
      qDegerler: { q1, q2, q3, q4 },
      yillikToplam,
      gerceklesmeOran: gerceklesmeOran == null ? null : Number(gerceklesmeOran.toFixed(2)),
    }
  })

  const { data: donemDurumRows } = await supabase
    .from('stratejik_plan_gosterge_veri_donem' as never)
    .select('ceyrek, durum')
    .eq('stratejik_donem_id', donemId)
    .eq('yil', yil)
  const ceyrekDurumlari: Record<number, 'Açık' | 'Kapalı'> = { 1: 'Kapalı', 2: 'Kapalı', 3: 'Kapalı', 4: 'Kapalı' }
  for (const r of donemDurumRows ?? []) {
    const q = Number((r as { ceyrek: number }).ceyrek)
    const d = String((r as { durum?: string }).durum ?? 'Kapalı')
    if ([1, 2, 3, 4].includes(q)) ceyrekDurumlari[q] = d === 'Açık' ? 'Açık' : 'Kapalı'
  }

  return (
    <StratejikPlanVeriGirisClient
      donemId={donemId}
      donemAdi={String((donem as { donem_adi?: string }).donem_adi ?? `Dönem #${donemId}`)}
      yil={yil}
      aktifCeyrek={secilenCeyrek as 1 | 2 | 3 | 4}
      tamamlananCeyrek={tamamlanan}
      ceyrekDurumlari={ceyrekDurumlari}
      mudurlukSecenekleri={izinMud}
      seciliMudurluk={seciliMudurluk}
      satirlar={satirlar}
      donemYonetebilir={donemYonetebilir}
      kayitYapabilir={tumunuGorebilir || km.mudurlukler.some(m => normMud(m) === normMud(seciliMudurluk))}
      onKaydet={stratejikVeriGirisKaydet}
      onDonemDurumAyarla={stratejikVeriDonemDurumAyarla}
    />
  )
}
