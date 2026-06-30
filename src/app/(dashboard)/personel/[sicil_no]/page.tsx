import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PersonelDetayClient from '@/components/personel/PersonelDetayClient'
import FirmaCalisanDetayView from '@/components/personel/FirmaCalisanDetayView'
import { calisanGuncelle } from './actions'
import { fetchPersonelDetayPageData, resolvePersonelRouteSegment } from '@/lib/personel-detay-load'
import { loadFirmaCalisanDetayPageData } from '@/lib/firma-calisan-load'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import {
  buildPersonelKonumCtx,
  etkinYerleskeAdiGoster,
  fetchSirketYerleskeTanimSatirlari,
  personelKonumMetni,
} from '@/lib/personel-gorev-konum'
import { fetchMudurlukYerleskeTanimSatirlari, etkinYerleskeId } from '@/lib/yerleske-adresi'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ sicil_no: string }>
  searchParams?: Promise<{ kaynak?: string }>
}

export default async function PersonelDetayPage({ params, searchParams }: Props) {
  const { sicil_no: rawSegment } = await params
  const supabase = await createClient()

  const sp = await searchParams?.catch(() => ({} as { kaynak?: string }))
  const kaynak = sp?.kaynak ?? ''

  const resolved = await resolvePersonelRouteSegment(supabase, rawSegment)
  if ('redirect' in resolved) redirect(resolved.redirect)
  const sicilSegment = resolved.sicil_no

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const saltOkunur = access?.mode === 'kullanici'
  const gecmisGoster = access ? isAdminLike(access) : true

  const data = await fetchPersonelDetayPageData(supabase, sicilSegment, kaynak)

  // ADABEL personeli (firma_calisanlar) calisan'da yok → kendi kişi kartını göster.
  if (!data) {
    const { data: firmaAdaylar } = await supabase
      .from('firma_calisanlar')
      .select('id')
      .eq('sicil_no', sicilSegment)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
    const firmaId = firmaAdaylar?.[0]?.id
    if (firmaId == null) notFound()
    if (access?.mode === 'kullanici' && access.sicilNo.trim() !== sicilSegment.trim()) notFound()
    const detail = await loadFirmaCalisanDetayPageData(supabase, firmaId)
    if (!detail) notFound()
    return (
      <FirmaCalisanDetayView
        row={detail.row}
        auditLoglar={gecmisGoster ? detail.auditLoglar : []}
        yerleskeMap={detail.yerleskeMap}
        saltOkunur={access?.mode === 'kullanici'}
      />
    )
  }

  const { calisan, ...rest } = data
  if (access?.mode === 'kullanici') {
    const own = access.sicilNo.trim()
    const card = (calisan.sicil_no ?? '').trim()
    if (!own || own !== card) notFound()
  }

  const [mudSatirlar, sirketSatirlar] = await Promise.all([
    fetchMudurlukYerleskeTanimSatirlari(supabase),
    fetchSirketYerleskeTanimSatirlari(supabase),
  ])
  const konumCtx = buildPersonelKonumCtx(mudSatirlar, sirketSatirlar)

  const D = new Date().toISOString().slice(0, 10)
  const sec = secilenKadroSatirAsil(rest.kadrolar, D)
  const gorevMud =
    String(sec?.gorev_mudurlugu ?? '').trim() || String(sec?.kadro_mudurlugu ?? '').trim()
  const kayitliYerleskeId =
    (calisan as Tables<'calisan'> & { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null
  const yId = etkinYerleskeId(konumCtx.yerleskeHarita, gorevMud, kayitliYerleskeId)
  const yerleskeAdi = etkinYerleskeAdiGoster(konumCtx, {
    gorevMudurlugu: gorevMud,
    kayitliYerleskeId,
  })
  let konumMetni = personelKonumMetni(konumCtx, {
    gorevYeri: calisan.gorev_yeri,
    gorevMudurlugu: gorevMud,
    yerleskeId: yId,
  })
  if ((calisan.gorev_turu ?? '') === 'Kurum Görevlendirme') konumMetni = 'Dış'

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
        <span className="text-slate-800 font-medium">{calisan.ad_soyad}</span>
      </nav>

      <PersonelDetayClient
        kaynak={rest.kaynak}
        calisan={calisan as Tables<'calisan'>}
        kadrolar={rest.kadrolar}
        hareketler={rest.hareketler}
        auditLoglar={rest.auditLoglar}
        izinHaklari={rest.izinHaklari}
        izinHareketleri={rest.izinHareketleri}
        terfiKayitlari={rest.terfiKayitlari}
        ogrenimler={rest.ogrenimler}
        aileBildirimi={rest.aileBildirimi}
        malKayitlari={rest.malKayitlari}
        egitimKatilimlari={rest.egitimKatilimlari}
        yevmiyeFazlaMesaiAylik={rest.yevmiyeFazlaMesaiAylik}
        tanimGostergeKha={rest.tanimGostergeKha}
        terfiOncesiTarihce={rest.terfiOncesiTarihce}
        onKisiselGuncelle={saltOkunur ? undefined : calisanGuncelle}
        saltOkunur={saltOkunur}
        gecmisGoster={gecmisGoster}
        yerleskeAdi={yerleskeAdi}
        konumMetni={konumMetni}
      />
    </div>
  )
}
