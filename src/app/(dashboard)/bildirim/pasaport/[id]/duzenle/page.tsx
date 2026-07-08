import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PasaportFormClient from '@/components/bildirim/PasaportFormClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  pasaportAyrilisNedeniNorm,
  pasaportPersonelDurumNorm,
} from '@/lib/pasaport-belge'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('pasaport_islemleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, kadro_id, derece, unvan, personel_durum, ayrilis_nedeni',
    )
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const personelDurum = pasaportPersonelDurumNorm(kayit.personel_durum)

  if (!isAdminLike(access)) {
    if (personelDurum === 'ayrilan') notFound()
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no ?? '').trim()) notFound()
  }

  let personeller: PasaportPersonel[] = []
  if (personelDurum === 'calisan' && kayit.sicil_no) {
    const kendi = await getPasaportPersonel(supabase, String(kayit.sicil_no).trim())
    personeller = kendi ? [kendi] : []
  }

  async function guncelle(fd: FormData) {
    'use server'
    return pasaportGuncelle(id, fd)
  }

  return (
    <PasaportFormClient
      mode="edit"
      personeller={personeller}
      sabitSicil={personelDurum === 'calisan' ? String(kayit.sicil_no ?? '').trim() : undefined}
      baslangicKadroId={kayit.kadro_id}
      baslangic={{
        personel_durum: personelDurum,
        ayrilis_nedeni: pasaportAyrilisNedeniNorm(kayit.ayrilis_nedeni),
        ad_soyad: kayit.ad_soyad ?? '',
        unvan: kayit.unvan ?? '',
        derece: kayit.derece ?? '',
        tckn: kayit.tckn ?? '',
      }}
      kayitId={id}
      ayrilanIzinli={isAdminLike(access)}
      onKaydet={guncelle}
    />
  )
}
