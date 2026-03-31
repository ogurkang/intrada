import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import IzinHakTekSatirDuzenleClient from '@/components/izin/IzinHakTekSatirDuzenleClient'
import { izinHakiKaydet } from '../actions'
import type { Tables, Views } from '@/types/database'

interface Props {
  searchParams: Promise<{ yil?: string; sicil_no?: string; return_to?: string }>
}

export default async function IzinHakDuzenlePage({ searchParams }: Props) {
  const { yil: yilStr, sicil_no: sicilParam, return_to } = await searchParams
  const sicil_no = String(sicilParam ?? '').trim()
  const buYil = new Date().getFullYear()
  const yil = parseInt(yilStr ?? String(buYil), 10) || buYil
  const returnTo = return_to?.trim() || '/'

  if (!sicil_no) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canEdit = access.mode === 'admin'

  const [{ data: personel }, { data: hak }] = await Promise.all([
    supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, statu').eq('sicil_no', sicil_no).maybeSingle(),
    supabase.from('izin_haklari').select('*').eq('yil', yil).eq('sicil_no', sicil_no).maybeSingle(),
  ])

  if (!personel?.sicil_no) notFound()

  const p = personel as Views<'personel_kadro_ozet'>
  const h = (hak ?? null) as Tables<'izin_haklari'> | null

  return (
    <div className="p-6">
      <IzinHakTekSatirDuzenleClient
        yil={yil}
        sicil_no={sicil_no}
        ad_soyad={p.ad_soyad}
        statu={p.statu}
        hak={h}
        returnTo={returnTo}
        canEdit={canEdit}
        onKaydet={izinHakiKaydet}
      />
    </div>
  )
}
