import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PasaportFormClient from '@/components/bildirim/PasaportFormClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getPasaportPersonel, type PasaportPersonel } from '@/lib/pasaport-personel'
import { pasaportGuncelle } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  const { data: kayit } = await supabase
    .from('pasaport_islemleri')
    .select('id, sicil_no, kadro_id')
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no).trim()) notFound()
  }

  const kendi = await getPasaportPersonel(supabase, String(kayit.sicil_no).trim())
  const personeller: PasaportPersonel[] = kendi ? [kendi] : []

  async function guncelle(fd: FormData) {
    'use server'
    return pasaportGuncelle(id, fd)
  }

  return (
    <PasaportFormClient
      mode="edit"
      personeller={personeller}
      sabitSicil={String(kayit.sicil_no).trim()}
      baslangicKadroId={kayit.kadro_id}
      kayitId={id}
      onKaydet={guncelle}
    />
  )
}
