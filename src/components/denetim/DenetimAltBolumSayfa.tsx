import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadDenetimGoruntulemelerGrouped } from '@/lib/denetim-goruntuleme'
import DenetimBolumBaslikListeClient, {
  type DenetimBolumBaslikSatir,
} from '@/components/denetim/DenetimBolumBaslikListeClient'
import {
  DENETIM_BOLUM_META,
  denetimAltBolumBul,
  denetimBolumFromSistem,
  denetimMenuYolu,
  type DenetimBelgeBolumu,
} from '@/lib/denetim'

export default async function DenetimAltBolumSayfa({
  donemId,
  bolum,
  altBolum,
  menuId,
}: {
  donemId: number
  bolum?: DenetimBelgeBolumu
  altBolum?: string
  menuId?: number
}) {
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const menuQuery = menuId
    ? supabase.from('denetim_donem_menu').select('*').eq('id', menuId).eq('donem_id', donemId).maybeSingle()
    : altBolum
      ? supabase.from('denetim_donem_menu').select('*').eq('donem_id', donemId).eq('sistem_anahtari', altBolum).maybeSingle()
      : Promise.resolve({ data: null })

  const [{ data: donem }, { data: menu }, { data: mudurlukler }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi, durum').eq('id', donemId).maybeSingle(),
    menuQuery,
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])
  if (!donem) notFound()

  const resolvedBolum = bolum ?? denetimBolumFromSistem(menu?.sistem_anahtari ?? altBolum ?? null)
  const alt = resolvedBolum && altBolum ? denetimAltBolumBul(resolvedBolum, altBolum) : null
  if (!menu && !alt) notFound()
  if (menu && menu.sayfa_turu !== 'belge') notFound()

  let baslikQuery = supabase
    .from('denetim_bolum_baslik')
    .select('id, baslik, aciklama, sorumlu_birim, sira_no, denetim_bolum_belge(id, sorumlu_birim, dosya_adi, created_by_email, updated_at)')
    .eq('donem_id', donemId)
    .order('sira_no')
  if (menu) baslikQuery = baslikQuery.eq('menu_id', menu.id)
  else if (resolvedBolum && altBolum) {
    baslikQuery = baslikQuery.eq('bolum', resolvedBolum).eq('alt_bolum', altBolum)
  }
  const { data: baslikRaw } = await baslikQuery

  const basliklar: DenetimBolumBaslikSatir[] = (baslikRaw ?? []).map(item => {
    const belge = Array.isArray(item.denetim_bolum_belge)
      ? item.denetim_bolum_belge[0] ?? null
      : item.denetim_bolum_belge
    return {
      id: item.id,
      baslik: item.baslik,
      aciklama: item.aciklama,
      sira_no: item.sira_no,
      belge_id: belge?.id ?? null,
      sorumlu_birim: belge?.sorumlu_birim ?? item.sorumlu_birim ?? null,
      dosya_adi: belge?.dosya_adi ?? null,
      yukleyen: belge?.created_by_email ?? null,
    }
  })

  const belgeIdler = basliklar.map(b => b.belge_id).filter((id): id is number => id != null)
  const [belgeAuditMap, baslikAuditMap, goruntulemelerByRefId] = await Promise.all([
    loadAuditLoglarGroupedByRefId(supabase, 'denetim_bolum_belge', belgeIdler.map(String)),
    loadAuditLoglarGroupedByRefId(supabase, 'denetim_bolum_baslik', basliklar.map(b => String(b.id))),
    loadDenetimGoruntulemelerGrouped(supabase, 'bolum', belgeIdler),
  ])
  const auditLoglarByBaslikId = Object.fromEntries(
    basliklar.map(b => {
      const belgeId = b.belge_id != null ? String(b.belge_id) : ''
      const loglar = [
        ...(baslikAuditMap[String(b.id)] ?? []),
        ...(belgeId ? belgeAuditMap[belgeId] ?? [] : []),
      ].sort((a, z) => z.created_at.localeCompare(a.created_at))
      return [String(b.id), loglar]
    }),
  )

  const parent = menu?.parent_id
    ? (
        await supabase
          .from('denetim_donem_menu')
          .select('id, baslik, sistem_anahtari')
          .eq('id', menu.parent_id)
          .maybeSingle()
      ).data
    : null

  const bolumLabel = parent?.baslik ?? (resolvedBolum ? DENETIM_BOLUM_META[resolvedBolum].label : 'Dönem')
  const bolumHref = parent
    ? denetimMenuYolu(donemId, parent)
    : resolvedBolum
      ? `/denetim/donemler/${donemId}/${DENETIM_BOLUM_META[resolvedBolum].path}`
      : `/denetim/donemler/${donemId}`

  return (
    <DenetimBolumBaslikListeClient
      donemId={donemId}
      donemAdi={donem.donem_adi}
      menuId={menu?.id ?? null}
      bolum={resolvedBolum}
      bolumLabel={bolumLabel}
      bolumHref={bolumHref}
      altBolum={menu?.sistem_anahtari ?? altBolum ?? ''}
      altBolumLabel={menu?.baslik ?? alt?.label ?? 'Alt Menü'}
      aciklama={menu?.aciklama ?? alt?.aciklama ?? ''}
      donemKapali={donem.durum === 'Kapalı'}
      basliklar={basliklar}
      mudurlukler={mudurlukler ?? []}
      auditLoglarByRefId={auditLoglarByBaslikId}
      goruntulemelerByRefId={goruntulemelerByRefId}
    />
  )
}
