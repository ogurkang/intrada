import PerformansProgramiButceKoduYonetimClient from '@/components/stratejik/PerformansProgramiButceKoduYonetimClient'
import { createClient } from '@/lib/supabase/server'
import { butceKoduEkle, butceKoduGuncelle } from './actions'

export default async function PerformansProgramiButceKoduPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: kodlar } = await sb
    .from('performans_programi_butce_kodu')
    .select('id, adim_1, adim_2, adim_3, adim_4, ekonomik_kod, hesap_adi')
    .order('ekonomik_kod', { ascending: true })

  return (
    <div className="space-y-5">
      <PerformansProgramiButceKoduYonetimClient
        rows={(kodlar ?? []) as {
          id: number
          adim_1: string
          adim_2: string
          adim_3: string
          adim_4: string
          ekonomik_kod: string
          hesap_adi: string
        }[]}
        onEkle={butceKoduEkle}
        onGuncelle={butceKoduGuncelle}
      />
    </div>
  )
}
