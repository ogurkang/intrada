import { createClient } from '@/lib/supabase/server'
import IzinHakYonetimClient from '@/components/izin/IzinHakYonetimClient'
import { izinHakiKaydet } from './actions'
import { izinHaklariKullanilanTopluGuncelle } from '../actions'
import { getAppAccess } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { izinHakkiAuditRefId } from '@/lib/izin-hakki-audit'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'
import type { Tables, Views } from '@/types/database'

interface Props {
  searchParams: Promise<{ yil?: string; sicil_no?: string; return_to?: string }>
}

export default async function IzinHaklarPage({ searchParams }: Props) {
  const { yil: yilStr, sicil_no, return_to } = await searchParams
  const buYil = new Date().getFullYear()
  const yil   = parseInt(yilStr ?? String(buYil), 10) || buYil

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canEdit = access.mode === 'admin'

  const bugun = new Date().toISOString().slice(0, 10)
  const [{ data: personelRaw }, { data: hakRaw }, { data: phRaw }] = await Promise.all([
    supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, ad_soyad, statu, kadro_durumu')
      .order('ad_soyad'),
    supabase
      .from('izin_haklari')
      .select('*')
      .eq('yil', yil),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ayrilis_nedeni')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  type PKO = Views<'personel_kadro_ozet'>
  const sonAyrilisHaritasi = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const personeller = filterOutGodmodeCalisan(
    ((personelRaw ?? []) as PKO[]).filter(p => {
      if (!p.sicil_no) return false
      if (!p.kadro_durumu) return false
      return personelAktifMi(sonAyrilisHaritasi.get(p.sicil_no), bugun)
    }),
  )
  const haklar      = (hakRaw      ?? []) as Tables<'izin_haklari'>[]

  // Her personel için o yılın hak kaydını eşleştir
  const hakMap = new Map(haklar.map(h => [h.sicil_no, h]))

  const satirlar = personeller
    .map(p => ({
      sicil_no: p.sicil_no ?? '',
      ad_soyad: p.ad_soyad,
      statu:    p.statu,
      hak:      p.sicil_no ? (hakMap.get(p.sicil_no) ?? null) : null,
    }))
    .sort((a, b) => String(a.sicil_no).localeCompare(String(b.sicil_no), undefined, { numeric: true }))

  // Yıl seçici için mevcut yıl ± 3
  const tumYillar = Array.from({ length: 7 }, (_, i) => buYil - 3 + i)

  const refIds = satirlar.map(s => izinHakkiAuditRefId(s.sicil_no, yil))
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(supabase, 'izin_haklari', refIds)

  return (
    <IzinHakYonetimClient
      yil={yil}
      satirlar={satirlar}
      tumYillar={tumYillar}
      onKaydet={izinHakiKaydet}
      onYenidenHesapla={canEdit ? izinHaklariKullanilanTopluGuncelle : undefined}
      odakSicilNo={sicil_no ?? null}
      returnTo={return_to ?? null}
      canEdit={canEdit}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
