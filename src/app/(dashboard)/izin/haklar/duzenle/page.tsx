import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import IzinHakTekSatirDuzenleClient from '@/components/izin/IzinHakTekSatirDuzenleClient'
import { izinHakiKaydet } from '../actions'
import { izinHakkiAuditRefId } from '@/lib/izin-hakki-audit'
import {
  izinHakArtisGecmisi,
  izinHakkiOnerilenHesapla,
  type IzinHakKural,
} from '@/lib/izin-hakki-artis'
import type { Tables, Views } from '@/types/database'

interface Props {
  searchParams: Promise<{ yil?: string; sicil_no?: string; return_to?: string }>
}

export default async function IzinHakDuzenlePage({ searchParams }: Props) {
  const { yil: yilStr, sicil_no: sicilParam, return_to } = await searchParams
  const sicil_no = String(sicilParam ?? '').trim()
  const buYil = new Date().getFullYear()
  const yil = parseInt(yilStr ?? String(buYil), 10) || buYil
  const returnTo = return_to?.trim() || '/'

  if (!sicil_no) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canEdit = access.mode === 'admin'

  const bugun = new Date().toISOString().slice(0, 10)
  const [{ data: personel }, { data: hak }, { data: hakOnceki }, { data: terfi }, { data: hakKuralRaw }, { data: auditRaw }] = await Promise.all([
    supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, ad_soyad, statu, kuruma_giris_tarihi')
      .eq('sicil_no', sicil_no)
      .maybeSingle(),
    supabase.from('izin_haklari').select('*').eq('yil', yil).eq('sicil_no', sicil_no).maybeSingle(),
    supabase.from('izin_haklari').select('hak_edilen_gun').eq('yil', yil - 1).eq('sicil_no', sicil_no).maybeSingle(),
    supabase
      .from('terfi_hareketleri')
      .select('kidem_yili, kidem_tarihi, kayit_zamani')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('tanim_izin_hak')
      .select('statu, en_az, en_cok, hak_edilen_gun, sira_no')
      .eq('durum', true)
      .order('sira_no', { nullsFirst: false }),
    supabase
      .from('personel_audit_log')
      .select('onceki, sonraki')
      .eq('modul', 'izin hakkı')
      .eq('ref_table', 'izin_haklari')
      .eq('ref_id', izinHakkiAuditRefId(sicil_no, yil))
      .order('created_at', { ascending: false }),
  ])

  if (!personel?.sicil_no) notFound()

  const p = personel as Views<'personel_kadro_ozet'>
  const h = (hak ?? null) as Tables<'izin_haklari'> | null
  const kurallar: IzinHakKural[] = (hakKuralRaw ?? []).map(k => ({
    statu: k.statu ?? '',
    en_az: k.en_az != null ? Number(k.en_az) : null,
    en_cok: k.en_cok != null ? Number(k.en_cok) : null,
    hak_edilen_gun: k.hak_edilen_gun ?? 0,
    sira_no: k.sira_no != null ? Number(k.sira_no) : null,
  }))
  const onerilen = izinHakkiOnerilenHesapla({
    statu: p.statu,
    kidemYiliTerfi: terfi ? parseInt(String(terfi.kidem_yili ?? '0'), 10) || 0 : null,
    kidemTarihiTerfi: terfi?.kidem_tarihi ?? null,
    kurumaGirisTarihi: p.kuruma_giris_tarihi,
    mevcutHak: h?.hak_edilen_gun ?? 0,
    kurallar,
    buYil: yil,
    bugun,
    terfiVar: !!terfi,
    oncekiYilHak: hakOnceki?.hak_edilen_gun ?? null,
    hakGecmisi: izinHakArtisGecmisi(auditRaw ?? []),
  })

  return (
    <div className="p-6">
      <IzinHakTekSatirDuzenleClient
        yil={yil}
        sicil_no={sicil_no}
        ad_soyad={p.ad_soyad}
        statu={p.statu}
        hak={h}
        returnTo={returnTo}
        canEdit={canEdit}
        onKaydet={izinHakiKaydet}
        kidemYili={onerilen?.kidemYili ?? null}
        onerilenHak={
          onerilen?.kapsamaGiriyor && !onerilen.esit && onerilen.onerilenHak > 0
            ? onerilen.onerilenHak
            : null
        }
        onYilArtisi={onerilen?.onYilArtisi === true}
      />
    </div>
  )
}
