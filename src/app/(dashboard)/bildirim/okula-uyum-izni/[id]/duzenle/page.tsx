import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OkulaUyumIzniFormClient from '@/components/bildirim/OkulaUyumIzniFormClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { okulaUyumIzniGuncelle } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OkulaUyumIzniDuzenlePage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('okula_uyum_izni_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, ogrenci_ad_soyad, baslayacagi_sinif',
    )
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no ?? '').trim()) notFound()
  }

  const sicil = String(kayit.sicil_no ?? '').trim()
  let personeller: BildirimFormPersonel[] = []
  if (isAdminLike(access)) {
    personeller = await listBildirimFormPersonel(supabase)
    if (!personeller.some(p => p.sicil_no === sicil)) {
      const kendi = await getBildirimFormPersonel(supabase, sicil)
      if (kendi) personeller = [kendi, ...personeller]
    }
  } else {
    const kendi = await getBildirimFormPersonel(supabase, sicil)
    personeller = kendi ? [kendi] : []
  }

  async function onKaydet(fd: FormData) {
    'use server'
    return okulaUyumIzniGuncelle(id, fd)
  }

  return (
    <OkulaUyumIzniFormClient
      mode="edit"
      kayitId={id}
      personeller={personeller}
      sabitSicil={sicil}
      baslangic={{
        ogrenci_ad_soyad: kayit.ogrenci_ad_soyad ?? '',
        baslayacagi_sinif: kayit.baslayacagi_sinif ?? '',
      }}
      onKaydet={onKaydet}
    />
  )
}
