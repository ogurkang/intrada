import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MalDetayClient from '@/components/bildirim/MalDetayClient'
import PersonelDetayClient from '@/components/personel/PersonelDetayClient'
import { resolveAppLinkSlug } from '@/lib/app-link-resolve'
import {
  fetchMalBildirimDetayKayit,
  parseSlugAsMalParam,
  type MalBildirimUrlParsedOk,
} from '@/lib/mal-bildirim-detail-load'
import { fetchPersonelDetayPageData } from '@/lib/personel-detay-load'
import { fetchFirmaCalisanById } from '@/lib/firma-calisan-load'
import { calisanGuncelle } from '@/app/(dashboard)/personel/[sicil_no]/actions'
import FirmaCalisanDetayView from '@/components/personel/FirmaCalisanDetayView'
import { loadKadroDetayPageData } from '@/lib/kadro-detay-load'
import KadroDetayClient from '@/components/kadro/KadroDetayClient'
import { kadroGuncelle } from '@/app/(dashboard)/kadro/actions'
import { personelHareketiGuncelle } from '@/app/(dashboard)/personel-hareketleri/actions'
import PersonelHareketiDuzenleClient from '@/components/personel/PersonelHareketiDuzenleClient'
import IzinHareketDetayView from '@/components/izin/IzinHareketDetayView'
import type { Tables } from '@/types/database'
import { yukleGidisAyrilisNedenleri } from '@/lib/hareket-tanim-gidis'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Canonical detay: `/link/{slug}` — mal, personel, firma, kadro, personel hareketi, izin (`app_links`).
 */
export default async function Page({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const linked = await resolveAppLinkSlug(supabase, slug)

  if (linked?.kind === 'personel') {
    const data = await fetchPersonelDetayPageData(supabase, linked.sicil_no, '')
    if (!data) notFound()
    const { calisan, kaynak, ...rest } = data
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
          kaynak={kaynak}
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
          onKisiselGuncelle={calisanGuncelle}
        />
      </div>
    )
  }

  if (linked?.kind === 'firma_calisan') {
    const row = await fetchFirmaCalisanById(supabase, linked.id)
    if (!row) notFound()
    return <FirmaCalisanDetayView row={row} />
  }

  if (linked?.kind === 'kadro_hareketi') {
    const detail = await loadKadroDetayPageData(supabase, linked.id)
    if (!detail) notFound()
    const { row, ...rest } = detail
    const r = row as Tables<'kadro_hareketleri'>
    const kadroBaslik =
      [r.kadro_sira_no, r.kadro_unvani ?? r.gorev_unvani]
        .filter(Boolean)
        .join(' – ') || `#${r.id}`
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/kadro" className="hover:text-slate-800 transition-colors">
            Kadro Hareketleri
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-medium">{kadroBaslik}</span>
        </nav>

        <KadroDetayClient
          row={r}
          adMap={rest.adMap}
          personeller={rest.personeller}
          statuler={rest.statuler}
          mudurluler={rest.mudurluler}
          unvanlar={rest.unvanlar}
          gelisNedenleri={rest.gelisNedenleri}
          ayrilisNedenleri={rest.ayrilisNedenleri}
          onGuncelle={kadroGuncelle}
          auditLoglar={rest.auditLoglar}
        />
      </div>
    )
  }

  if (linked?.kind === 'personel_hareketi') {
    const [{ data: hareket }, { data: unvanRows }, ayrilisNedenleri] = await Promise.all([
      supabase.from('personel_hareketleri').select('*').eq('id', linked.id).single(),
      supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('sira_no'),
      yukleGidisAyrilisNedenleri(supabase),
    ])
    if (!hareket) notFound()
    const unvanlar = (unvanRows ?? [])
      .map(r => ({ id: r.id, unvan_adi: r.unvan_adi }))
      .filter(u => u.unvan_adi)
    return (
      <PersonelHareketiDuzenleClient
        hareket={hareket as Tables<'personel_hareketleri'>}
        unvanlar={unvanlar}
        ayrilisNedenleri={ayrilisNedenleri}
        onGuncelle={personelHareketiGuncelle}
      />
    )
  }

  if (linked?.kind === 'izin_hareketi') {
    const { data: izin, error } = await supabase
      .from('izin_hareketleri')
      .select('*')
      .eq('id', linked.id)
      .single()
    if (error || !izin) notFound()
    const { data: calisanRow } = await supabase
      .from('calisan')
      .select('ad_soyad')
      .eq('sicil_no', izin.sicil_no)
      .maybeSingle()
    const h = izin as Tables<'izin_hareketleri'>
    const listeyeYil = h.yil ?? new Date().getFullYear()
    return (
      <IzinHareketDetayView
        h={h}
        adSoyad={calisanRow?.ad_soyad}
        listeyeYil={listeyeYil}
        duzenleHref={`/izin/${h.id}/duzenle`}
      />
    )
  }

  let parsed: MalBildirimUrlParsedOk | null = null
  if (linked?.kind === 'mal_bildirimi') {
    parsed = { ok: true, by: 'public_id', public_id: linked.public_id }
  } else {
    parsed = parseSlugAsMalParam(slug)
  }

  if (!parsed) notFound()

  const kayit = await fetchMalBildirimDetayKayit(supabase, parsed)
  if (!kayit) notFound()

  return <MalDetayClient kayit={kayit} />
}
