import { createClient } from '@/lib/supabase/server'
import MudurlukTanimClient from '@/components/tanimlar/MudurlukTanimClient'
import { mudurlukEkle, mudurlukGuncelle, mudurlukToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type MudurlukRow = Tables<'tanim_mudurluk'>

type MudurlukKayit = MudurlukRow & {
  yerleske_adi_goster: string
  yerleske_adresi_ids: number[]
}

type YerleskeLinkRow = {
  yerleske_adresi_id: number
  tanim_yerleske_adresi: { yerleske_adi: string } | null
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
    const adlar = links
      .map(l => l.tanim_yerleske_adresi?.yerleske_adi)
      .filter((a): a is string => !!a)
    const { tanim_mudurluk_yerleske: _, ...rest } = row as typeof row & {
      tanim_mudurluk_yerleske?: YerleskeLinkRow[]
    }
    return {
      ...rest,
      yerleske_adresi_ids: links.map(l => l.yerleske_adresi_id),
      yerleske_adi_goster: adlar.length > 0 ? adlar.join(', ') : '—',
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
