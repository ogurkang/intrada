import { createClient } from '@/lib/supabase/server'
import SirketTanimClient from '@/components/tanimlar/SirketTanimClient'
import { sirketEkle, sirketGuncelle, sirketToggleAktif } from './actions'
import type { Tables } from '@/types/database'
import type { SirketYerleskeEsleme } from '@/components/tanimlar/SirketTanimClient'

type SirketRow = Tables<'tanim_sirket'> & { sirket_adi: string }

export type SirketKayit = SirketRow & {
  yerleske_eslemeleri: SirketYerleskeEsleme[]
  yerleske_adi_goster: string
}

type YerleskeLinkRow = {
  yerleske_adresi_id: number
  konum: string
  tanim_yerleske_adresi: { yerleske_adi: string } | null
}

function yerleskeGosterim(links: YerleskeLinkRow[]): string {
  if (links.length === 0) return '—'
  return links
    .map(l => {
      const ad = l.tanim_yerleske_adresi?.yerleske_adi
      if (!ad) return null
      const konum = l.konum === 'Dış' ? 'Dış' : l.konum === 'İç' ? 'İç' : l.konum
      return `${ad} (${konum})`
    })
    .filter((s): s is string => !!s)
    .join(', ')
}

export default async function SirketPage() {
  const supabase = await createClient()

  const [{ data, error }, { data: yerleskeRaw }] = await Promise.all([
    supabase
      .from('tanim_sirket')
      .select(`
        *,
        tanim_sirket_yerleske (
          yerleske_adresi_id,
          konum,
          tanim_yerleske_adresi ( yerleske_adi )
        )
      `)
      .order('sirket_adi'),
    supabase
      .from('tanim_yerleske_adresi')
      .select('id, yerleske_adi')
      .eq('aktif', true)
      .order('yerleske_adi'),
  ])

  const kayitlar: SirketKayit[] = (data ?? []).map(row => {
    const links = (row.tanim_sirket_yerleske ?? []) as YerleskeLinkRow[]
    const { tanim_sirket_yerleske: _, ...rest } = row as typeof row & {
      tanim_sirket_yerleske?: YerleskeLinkRow[]
    }
    const yerleske_eslemeleri: SirketYerleskeEsleme[] = links
      .filter(l => l.tanim_yerleske_adresi?.yerleske_adi)
      .map(l => ({
        yerleske_adresi_id: l.yerleske_adresi_id,
        yerleske_adi: l.tanim_yerleske_adresi!.yerleske_adi,
        konum: l.konum === 'Dış' ? 'Dış' : 'İç',
      }))
    return {
      ...(rest as SirketRow),
      yerleske_eslemeleri,
      yerleske_adi_goster: yerleskeGosterim(links),
    }
  })

  const yerleskeSecenekleri = (yerleskeRaw ?? []).map(y => ({
    id: y.id,
    label: y.yerleske_adi,
  }))

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <SirketTanimClient
        data={kayitlar}
        yerleskeSecenekleri={yerleskeSecenekleri}
        onAdd={sirketEkle}
        onUpdate={sirketGuncelle}
        onToggle={sirketToggleAktif}
      />
    </>
  )
}
