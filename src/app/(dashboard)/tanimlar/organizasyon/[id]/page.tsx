import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrganizasyonDetayClient from '@/components/tanimlar/OrganizasyonDetayClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import {
  BIRIM_TURU_ETIKET,
  birimPersonelMetni,
  organizasyonPersonelIndeksKur,
  type BirimTuru,
  type KadroUnvanSatir,
  type OrganizasyonBirimSatir,
} from '@/lib/organizasyon-birim'
import { birimEkle, birimSil } from '../actions'

export const dynamic = 'force-dynamic'

export type OrganizasyonBirim = OrganizasyonBirimSatir

type BirimRow = {
  id: number
  mudurluk_id: number | null
  birim_turu: string
  personel_sicil_no: string | null
  ust_birim_id: number | null
  sira_no: number | null
  tanim_mudurluk: { mudurluk_adi: string } | null
}

export default async function OrganizasyonDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idRaw } = await params
  const id = Number(idRaw)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const supabase = await createClient()

  const { data: organizasyon } = await supabase
    .from('tanim_organizasyon')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!organizasyon) notFound()

  const [{ data: birimRaw, error: birimErr }, { data: mudurlukRaw }, { data: kadroRaw }] = await Promise.all([
    supabase
      .from('tanim_organizasyon_birim')
      .select('id, mudurluk_id, birim_turu, personel_sicil_no, ust_birim_id, sira_no, tanim_mudurluk ( mudurluk_adi )')
      .eq('organizasyon_id', id),
    supabase
      .from('tanim_mudurluk')
      .select('id, mudurluk_adi')
      .eq('aktif', true)
      .order('mudurluk_adi'),
    supabase
      .from('kadro_hareketleri')
      .select(
        'durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil, asil_calisan:calisan!kadro_hareketleri_asil_fkey ( ad_soyad ), vekil_calisan:calisan!kadro_hareketleri_vekil_fkey ( ad_soyad )',
      )
      .in('durumu', ['Dolu', 'Vekil']),
  ])

  const indeks = organizasyonPersonelIndeksKur((kadroRaw ?? []) as unknown as KadroUnvanSatir[])

  const birimler: OrganizasyonBirim[] = ((birimRaw ?? []) as BirimRow[]).map(b => {
    const birim_turu = (b.birim_turu as BirimTuru) ?? 'mudurluk'
    const mudurlukAdi = b.tanim_mudurluk?.mudurluk_adi ?? null
    const ad =
      birim_turu === 'mudurluk' ? (mudurlukAdi ?? '(silinmiş müdürlük)') : BIRIM_TURU_ETIKET[birim_turu]
    return {
      id: b.id,
      birim_turu,
      mudurluk_id: b.mudurluk_id,
      personel_sicil_no: b.personel_sicil_no,
      ad,
      personel_adi: birimPersonelMetni(indeks, birim_turu, mudurlukAdi, b.personel_sicil_no),
      personel_telefon: '',
      ust_birim_id: b.ust_birim_id,
      sira_no: b.sira_no ?? 0,
    }
  })

  const eklenmisOzel = new Set(birimler.filter(b => b.birim_turu !== 'mudurluk').map(b => b.birim_turu))
  const eklenmisBaskanYrdSicil = birimler
    .filter(b => b.birim_turu === 'baskan_yardimcisi' && b.personel_sicil_no)
    .map(b => b.personel_sicil_no as string)
  const mudurlukSecenekleri = (mudurlukRaw ?? []).map(m => ({ id: m.id, label: m.mudurluk_adi }))

  const auditMap = await loadAuditLoglarGroupedByRefId(supabase, 'tanim_organizasyon', [String(id)])
  const auditLoglar = auditMap[String(id)] ?? []

  return (
    <>
      {birimErr && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Birimler yüklenirken hata: {birimErr.message}
        </div>
      )}
      <OrganizasyonDetayClient
        organizasyonId={id}
        organizasyonAdi={organizasyon.organizasyon_adi}
        aktif={organizasyon.aktif}
        birimler={birimler}
        mudurlukSecenekleri={mudurlukSecenekleri}
        baskanEklenmis={eklenmisOzel.has('baskan')}
        baskanYardimcisiAdaylari={indeks.baskanYardimcisiAdaylari}
        eklenmisBaskanYrdSicil={eklenmisBaskanYrdSicil}
        auditLoglar={auditLoglar}
        onBirimEkle={birimEkle}
        onBirimSil={birimSil}
      />
    </>
  )
}
