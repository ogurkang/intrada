import type { SupabaseClient } from '@supabase/supabase-js'
import { denetimMenuYolu, type DenetimMenuIkonAnahtar, type DenetimMenuSayfaTuru } from '@/lib/denetim'
import type { Tables } from '@/types/database'

export type DenetimMenuKayit = Tables<'denetim_donem_menu'>

export type DenetimSidebarMenu = {
  id: number
  href: string
  label: string
  aciklama: string | null
  ikon: DenetimMenuIkonAnahtar | undefined
  sayfa_turu: DenetimMenuSayfaTuru
  children?: DenetimSidebarMenu[]
}

export type DenetimSidebarDonem = {
  id: number
  donem_adi: string
  durum: 'Açık' | 'Kapalı'
  sira_no: number
  menus: DenetimSidebarMenu[]
}

export type DenetimMenuSecenek = {
  id: number
  donem_id: number
  parent_id: number | null
  baslik: string
}

function ikonCoz(v: string | null): DenetimMenuIkonAnahtar | undefined {
  if (!v) return undefined
  return v as DenetimMenuIkonAnahtar
}

export function denetimMenuAgaciKur(
  donemId: number,
  kayitlar: DenetimMenuKayit[],
): DenetimSidebarMenu[] {
  const byParent = new Map<number | null, DenetimMenuKayit[]>()
  for (const row of kayitlar) {
    const key = row.parent_id
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sira_no - b.sira_no || a.id - b.id)
  }

  function childrenOf(parentId: number | null): DenetimSidebarMenu[] {
    return (byParent.get(parentId) ?? []).map(row => {
      const kids = childrenOf(row.id)
      return {
        id: row.id,
        href: denetimMenuYolu(donemId, row),
        label: row.baslik,
        aciklama: row.aciklama,
        ikon: ikonCoz(row.ikon),
        sayfa_turu: row.sayfa_turu,
        children: kids.length ? kids : undefined,
      }
    })
  }

  return childrenOf(null)
}

export async function loadDenetimSidebarAgac(
  supabase: SupabaseClient,
): Promise<DenetimSidebarDonem[]> {
  const { data: donemler, error: donemErr } = await supabase
    .from('denetim_donem')
    .select('id, donem_adi, durum, sira_no')
    .order('sira_no', { ascending: false })
  if (donemErr || !donemler?.length) return []

  const { data: menuler, error: menuErr } = await supabase
    .from('denetim_donem_menu')
    .select('*')
    .in('donem_id', donemler.map(d => d.id))
    .order('sira_no')
  if (menuErr) {
    console.error('DENETIM_MENU_LOAD_FAILED', menuErr.message)
  }

  const byDonem = new Map<number, DenetimMenuKayit[]>()
  for (const row of (menuler ?? []) as DenetimMenuKayit[]) {
    const list = byDonem.get(row.donem_id) ?? []
    list.push(row)
    byDonem.set(row.donem_id, list)
  }

  return donemler.map(d => ({
    id: d.id,
    donem_adi: d.donem_adi,
    durum: d.durum as 'Açık' | 'Kapalı',
    sira_no: d.sira_no,
    menus: denetimMenuAgaciKur(d.id, byDonem.get(d.id) ?? []),
  }))
}
