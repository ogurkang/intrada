import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { yevmiyePuantajYukle } from './actions'
import YevmiyePuantajClient from '@/components/kesintiler/YevmiyePuantajClient'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function YevmiyePuantajPage({ params }: Props) {
  const { donem_id: donemIdStr } = await params
  const donem_id = parseInt(donemIdStr, 10)
  if (isNaN(donem_id)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const sicilNo = access.mode === 'kullanici' ? access.sicilNo : undefined
  const { data, hata } = await yevmiyePuantajYukle(donem_id, sicilNo ? { sicilNo } : undefined)
  if (hata || !data) notFound()

  return (
    <div>
      <YevmiyePuantajClient
        data={data}
        donemId={donem_id}
        showAnaSayfaLink={access.mode === 'kullanici'}
      />
    </div>
  )
}
