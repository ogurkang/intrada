import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import YariZamanliCalismaFormClient from '@/components/bildirim/YariZamanliCalismaFormClient'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { yzcCalismaProgramiNormalize } from '@/lib/yari-zamanli-calisma-belge'
import { yariZamanliCalismaGuncelle } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function YariZamanliCalismaDuzenlePage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('yari_zamanli_calisma_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, cocuk_dogum_tarihi, yari_zamanli_baslangic_tarihi, normal_zamanli_donus_tarihi, calisma_programi',
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
    return yariZamanliCalismaGuncelle(id, fd)
  }

  return (
    <YariZamanliCalismaFormClient
      mode="edit"
      kayitId={id}
      personeller={personeller}
      sabitSicil={sicil}
      baslangic={{
        cocuk_dogum_tarihi: kayit.cocuk_dogum_tarihi,
        yari_zamanli_baslangic_tarihi: kayit.yari_zamanli_baslangic_tarihi,
        normal_zamanli_donus_tarihi: kayit.normal_zamanli_donus_tarihi,
        calisma_programi: yzcCalismaProgramiNormalize(kayit.calisma_programi),
      }}
      onKaydet={onKaydet}
    />
  )
}
