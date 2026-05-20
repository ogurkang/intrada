import { createClient } from '@/lib/supabase/server'
import MudurlukTanimClient from '@/components/tanimlar/MudurlukTanimClient'
import { mudurlukEkle, mudurlukGuncelle, mudurlukToggleAktif } from './actions'
import type { Tables } from '@/types/database'
import type { MudurlukYerleskeEsleme } from '@/components/tanimlar/MudurlukTanimClient'

type MudurlukRow = Tables<'tanim_mudurluk'>

export type MudurlukKayit = MudurlukRow & {
  yerleske_eslemeleri: MudurlukYerleskeEsleme[]
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

export default async function MudurlukPage() {
  const supabase = await createClient()

  const [{ data, error }, { data: yerleskeRaw }] = await Promise.all([
    supabase
      .from('tanim_mudurluk')
      .select(`
        *,
        tanim_mudurluk_yerleske (
          yerleske_adresi_id,
          konum,
          tanim_yerleske_adresi ( yerleske_adi )
        )
      `)
      .order('mudurluk_adi'),
    supabase
      .from('tanim_yerleske_adresi')
      .select('id, yerleske_adi')
      .eq('aktif', true)
      .order('yerleske_adi'),
  ])

  const kayitlar: MudurlukKayit[] = (data ?? []).map((row) => {
    const links = (row.tanim_mudurluk_yerleske ?? []) as YerleskeLinkRow[]
    const { tanim_mudurluk_yerleske: _, ...rest } = row as typeof row & {
      tanim_mudurluk_yerleske?: YerleskeLinkRow[]
    }
    const yerleske_eslemeleri: MudurlukYerleskeEsleme[] = links
      .filter(l => l.tanim_yerleske_adresi?.yerleske_adi)
      .map(l => ({
        yerleske_adresi_id: l.yerleske_adresi_id,
        yerleske_adi: l.tanim_yerleske_adresi!.yerleske_adi,
        konum: l.konum === 'Dış' ? 'Dış' : 'İç',
      }))
    return {
      ...rest,
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
      <MudurlukTanimClient
        data={kayitlar}
        yerleskeSecenekleri={yerleskeSecenekleri}
        onAdd={mudurlukEkle}
        onUpdate={mudurlukGuncelle}
        onToggle={mudurlukToggleAktif}
      />
    </>
  )
}
