import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { loadDenetimGoruntulemelerGrouped } from '@/lib/denetim-goruntuleme'
import DenetimBolumBaslikListeClient, {
  type DenetimBolumBaslikSatir,
} from '@/components/denetim/DenetimBolumBaslikListeClient'
import { denetimBolumFromSistem } from '@/lib/denetim'

const BELGE_ALANLARI = 'denetim_bolum_belge(id, sorumlu_birim, dosya_adi, created_by_email, updated_at)'

export default async function DenetimHubBaslikBolumu({
  donemId,
  donemAdi,
  donemKapali,
  menuId,
  menuBaslik,
  gomuluMod = 'liste',
}: {
  donemId: number
  donemAdi: string
  donemKapali: boolean
  menuId: number
  menuBaslik: string
  gomuluMod?: 'dugme' | 'liste'
}) {
  const supabase = await createClient()
  const saltOkunur = await isCurrentDisDenetci(supabase)

  const [{ data: menu }, { data: mudurlukler }] = await Promise.all([
    supabase.from('denetim_donem_menu').select('id, baslik, sistem_anahtari').eq('id', menuId).maybeSingle(),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
  ])
  if (!menu) return null

  const resolvedBolum = denetimBolumFromSistem(menu.sistem_anahtari)

  async function basliklariGetir(sorumluBirimKolonu: boolean) {
    let q = supabase
      .from('denetim_bolum_baslik')
      .select(
        `id, baslik, aciklama, sira_no${sorumluBirimKolonu ? ', sorumlu_birim' : ''}, ${BELGE_ALANLARI}`,
      )
      .eq('donem_id', donemId)
      .eq('menu_id', menuId)
      .order('sira_no')
    return q
  }

  let { data: baslikRaw, error: baslikError } = await basliklariGetir(true)
  if (baslikError) {
    ;({ data: baslikRaw, error: baslikError } = await basliklariGetir(false))
  }
  if (baslikError) console.error('DENETIM_HUB_BASLIK_LOAD_FAILED', baslikError.message)

  type BaslikRow = {
    id: number
    baslik: string
    aciklama: string | null
    sira_no: number
    sorumlu_birim?: string | null
    denetim_bolum_belge?:
      | { id: number; sorumlu_birim: string | null; dosya_adi: string; created_by_email: string | null }
      | { id: number; sorumlu_birim: string | null; dosya_adi: string; created_by_email: string | null }[]
      | null
  }

  const basliklar: DenetimBolumBaslikSatir[] = ((baslikRaw ?? []) as unknown as BaslikRow[]).map(item => {
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

  return (
    <DenetimBolumBaslikListeClient
      donemId={donemId}
      donemAdi={donemAdi}
      menuId={menuId}
      bolum={resolvedBolum}
      bolumLabel="Dönem"
      bolumHref={`/denetim/donemler/${donemId}`}
      altBolum={menu.sistem_anahtari ?? menuBaslik}
      altBolumLabel={menu.baslik ?? menuBaslik}
      aciklama=""
      donemKapali={donemKapali}
      basliklar={basliklar}
      mudurlukler={mudurlukler ?? []}
      auditLoglarByRefId={auditLoglarByBaslikId}
      goruntulemelerByRefId={goruntulemelerByRefId}
      saltOkunur={saltOkunur}
      gomulu
      gomuluMod={gomuluMod}
    />
  )
}
