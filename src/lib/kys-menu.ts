import type { SupabaseClient } from '@supabase/supabase-js'
import { kysMenuYolu, type KysMenuSayfaTuru } from '@/lib/kys'
import type { Tables } from '@/types/database'

export type KysMenuKayit = Tables<'kys_menu'>

export type KysSidebarMenu = {
  id: number
  href: string
  label: string
  aciklama: string | null
  ikon: string | undefined
  sayfa_turu: KysMenuSayfaTuru
  children?: KysSidebarMenu[]
}

export function kysMenuAgaciKur(kayitlar: KysMenuKayit[]): KysSidebarMenu[] {
  const byParent = new Map<number | null, KysMenuKayit[]>()
  for (const row of kayitlar) {
    const key = row.parent_id
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sira_no - b.sira_no || a.id - b.id)
  }

  function childrenOf(parentId: number | null): KysSidebarMenu[] {
    return (byParent.get(parentId) ?? []).map(row => {
      const kids = childrenOf(row.id)
      return {
        id: row.id,
        href: kysMenuYolu(row.id),
        label: row.baslik,
        aciklama: row.aciklama,
        ikon: row.ikon ?? undefined,
        sayfa_turu: row.sayfa_turu,
        children: kids.length ? kids : undefined,
      }
    })
  }

  return childrenOf(null)
}

export async function loadKysSidebarAgac(supabase: SupabaseClient): Promise<KysSidebarMenu[]> {
  const { data, error } = await supabase
    .from('kys_menu')
    .select('*')
    .order('sira_no')
  if (error) {
    console.error('KYS_MENU_LOAD_FAILED', error.message)
    return []
  }
  return kysMenuAgaciKur((data ?? []) as KysMenuKayit[])
}
