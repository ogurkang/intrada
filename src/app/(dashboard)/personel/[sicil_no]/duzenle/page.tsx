import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getAppAccess } from '@/lib/app-access'
import Link from 'next/link'
import PersonelKisiselDuzenleClient from '@/components/personel/PersonelKisiselDuzenleClient'
import { calisanGuncelle } from '../actions'
import { resolvePersonelSegmentToSicil } from '@/lib/personel-detay-load'
import { personelDetayHref } from '@/lib/personel-link'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import {
  etkinYerleskeId,
  fetchMudurlukYerleskeTanimSatirlari,
  mudurlukYerleskeHaritasi,
  yerleskeSecenekleri,
} from '@/lib/yerleske-adresi'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ sicil_no: string }>
  searchParams?: Promise<{ kaynak?: string }>
}

export default async function PersonelDuzenlePage({ params, searchParams }: Props) {
  const { sicil_no: rawSegment } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const access = await getAppAccess(supabase, user.id)
    if (access.mode === 'kullanici') notFound()
  }

  const sicil_no = await resolvePersonelSegmentToSicil(supabase, rawSegment)

  const { data: calisan, error } = await supabase
    .from('calisan')
    .select('*')
    .eq('sicil_no', sicil_no)
    .single()

  if (error || !calisan) notFound()

  const sp = await searchParams?.catch(() => ({} as { kaynak?: string }))
  const kaynak = sp?.kaynak ?? ''

  const c = calisan as Tables<'calisan'>
  const detayHref = personelDetayHref(c, kaynak ? { kaynak } : undefined)

  const { data: kadroRows } = await supabase
    .from('kadro_hareketleri')
    .select('*')
    .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
  const anaKadro = anaKadroSec((kadroRows ?? []) as Tables<'kadro_hareketleri'>[], sicil_no)
  const hizmetKaynagi = {
    memuriyet_tarihi: anaKadro?.memuriyet_tarihi ?? c.memuriyet_tarihi ?? null,
    kuruma_giris_tarihi: anaKadro?.kuruma_giris_tarihi ?? c.kuruma_giris_tarihi ?? null,
    hizmet_suresi_yil: c.hizmet_suresi_yil ?? 0,
    hizmet_suresi_ay: c.hizmet_suresi_ay ?? 0,
    hizmet_suresi_gun: c.hizmet_suresi_gun ?? 0,
  }

  const gorevMudurlugu = String(anaKadro?.gorev_mudurlugu ?? anaKadro?.kadro_mudurlugu ?? '').trim()
  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const yerleskeHarita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const yerleskeOpts = yerleskeSecenekleri(yerleskeHarita, gorevMudurlugu)
  const kayitliYerleskeId = (c as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null
  const seciliYerleskeId = etkinYerleskeId(yerleskeHarita, gorevMudurlugu, kayitliYerleskeId)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link
          href={kaynak === 'ayrilanlar' ? '/personel/ayrilanlar' : '/personel'}
          className="hover:text-slate-800 transition-colors"
        >
          {kaynak === 'ayrilanlar' ? 'Ayrılanlar' : 'Çalışanlar'}
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={detayHref} className="hover:text-slate-800 transition-colors">
          {calisan.ad_soyad}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Düzenle</span>
      </nav>

      <PersonelKisiselDuzenleClient
        calisan={calisan as Tables<'calisan'> & { gorev_turu_bitis_tarihi?: string | null }}
        kaynak={kaynak || undefined}
        hizmetKaynagi={hizmetKaynagi}
        onGuncelle={calisanGuncelle}
        yerleskeSecenekleri={yerleskeOpts}
        seciliYerleskeId={seciliYerleskeId}
      />
    </div>
  )
}
