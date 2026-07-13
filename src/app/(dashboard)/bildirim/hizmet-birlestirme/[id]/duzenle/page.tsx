import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import HizmetBirlestirmeFormClient from '@/components/bildirim/HizmetBirlestirmeFormClient'
import { hizmetBirlestirmePersonelDurumNorm } from '@/lib/hizmet-birlestirme-belge'
import {
  getHizmetBirlestirmePersonel,
  type HizmetBirlestirmePersonel,
} from '@/lib/hizmet-birlestirme-personel'
import { hizmetBirlestirmeGuncelle } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('hizmet_birlestirme_islemleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, personel_durum, emeklilik_sicil_no, ssk, bagkur_sicil_no, hizmet_illeri',
    )
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const personelDurum = hizmetBirlestirmePersonelDurumNorm(kayit.personel_durum)

  if (!isAdminLike(access)) {
    if (personelDurum === 'ayrilan') notFound()
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no ?? '').trim()) notFound()
  }

  let personeller: HizmetBirlestirmePersonel[] = []
  if (personelDurum === 'calisan' && kayit.sicil_no) {
    const p = await getHizmetBirlestirmePersonel(supabase, kayit.sicil_no)
    if (p) personeller = [p]
  }

  async function onKaydet(fd: FormData) {
    'use server'
    return hizmetBirlestirmeGuncelle(id, fd)
  }

  return (
    <HizmetBirlestirmeFormClient
      mode="edit"
      personeller={personeller}
      sabitSicil={personelDurum === 'calisan' ? String(kayit.sicil_no ?? '') : undefined}
      kayitId={id}
      ayrilanIzinli={isAdminLike(access)}
      baslangic={{
        personel_durum: personelDurum,
        ad_soyad: kayit.ad_soyad,
        tckn: kayit.tckn,
        emeklilik_sicil_no: kayit.emeklilik_sicil_no,
        ssk: kayit.ssk,
        bagkur_sicil_no: kayit.bagkur_sicil_no,
        hizmet_illeri: kayit.hizmet_illeri,
      }}
      onKaydet={onKaydet}
    />
  )
}
