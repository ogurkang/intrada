import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadKysGoruntulemelerGrouped } from '@/lib/kys-goruntuleme'
import { kysMenuYolu } from '@/lib/kys'
import KysBaslikListeClient, { type KysBaslikSatir } from '@/components/kys/KysBaslikListeClient'

export default async function KysAltMenuSayfa({ menuId }: { menuId: number }) {
  if (!Number.isFinite(menuId) || menuId <= 0) notFound()

  const supabase = await createClient()
  const saltOkunur = await isCurrentDisDenetci(supabase)
  const [{ data: menu }, { data: mudurlukler }] = await Promise.all([
    supabase.from('kys_menu').select('*').eq('id', menuId).maybeSingle(),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])
  if (!menu || menu.sayfa_turu !== 'belge') notFound()

  const { data: baslikRaw, error: baslikError } = await supabase
    .from('kys_baslik')
    .select('id, baslik, aciklama, sira_no, sorumlu_birim, kys_belge(id, sorumlu_birim, dosya_adi, created_by_email)')
    .eq('menu_id', menuId)
    .order('sira_no')
  if (baslikError) console.error('KYS_BASLIK_LOAD_FAILED', baslikError.message)

  type BaslikRow = {
    id: number
    baslik: string
    aciklama: string | null
    sira_no: number
    sorumlu_birim: string | null
    kys_belge?:
      | { id: number; sorumlu_birim: string | null; dosya_adi: string; created_by_email: string | null }
      | { id: number; sorumlu_birim: string | null; dosya_adi: string; created_by_email: string | null }[]
      | null
  }

  const basliklar: KysBaslikSatir[] = ((baslikRaw ?? []) as unknown as BaslikRow[]).map(item => {
    const belge = Array.isArray(item.kys_belge) ? item.kys_belge[0] ?? null : item.kys_belge
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
    loadAuditLoglarGroupedByRefId(supabase, 'kys_belge', belgeIdler.map(String)),
    loadAuditLoglarGroupedByRefId(supabase, 'kys_baslik', basliklar.map(b => String(b.id))),
    loadKysGoruntulemelerGrouped(supabase, belgeIdler),
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

  const parent = menu.parent_id
    ? (await supabase.from('kys_menu').select('id, baslik').eq('id', menu.parent_id).maybeSingle()).data
    : null

  return (
    <KysBaslikListeClient
      menuId={menu.id}
      menuLabel={menu.baslik}
      aciklama={menu.aciklama ?? ''}
      parentLabel={parent?.baslik ?? 'KYS Yönetimi'}
      parentHref={parent ? kysMenuYolu(parent.id) : '/kys'}
      basliklar={basliklar}
      mudurlukler={mudurlukler ?? []}
      auditLoglarByRefId={auditLoglarByBaslikId}
      goruntulemelerByRefId={goruntulemelerByRefId}
      saltOkunur={saltOkunur}
    />
  )
}
