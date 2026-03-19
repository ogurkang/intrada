import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PersonelHareketiGoruntuleClient from '@/components/personel/PersonelHareketiGoruntuleClient'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>
type Calisan = Tables<'calisan'>

const HAREKET_TIPI_LABEL: Record<string, string> = {
  IlkAtanma: 'İlk Atanma',
  YerDegistirme: 'Yer Değiştirme',
  Yukselme: 'Yükselme',
}

export default async function PersonelHareketiGoruntulePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: sicil_no } = await params
  if (!sicil_no?.trim()) notFound()

  const supabase = await createClient()

  const [
    { data: calisan },
    { data: phRows },
    { data: ogrenimRows },
  ] = await Promise.all([
    supabase.from('calisan').select('*').eq('sicil_no', sicil_no).single(),
    supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false })
      .limit(1),
    supabase.from('calisan_ogrenim').select('ogrenim_turu').eq('sicil_no', sicil_no).eq('aktif', true).limit(1),
  ])

  const hareket = (phRows ?? [])[0] as PH | null
  if (!calisan) notFound()
  if (!hareket) {
    return (
      <div className="space-y-4">
        <Link href="/personel-hareketleri" className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 inline-block">
          ← Listeye Dön
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
          <p className="font-medium">Bu personel için henüz personel hareketi kaydı bulunmuyor.</p>
          <p className="text-sm mt-1">Değiştir ile yeni kayıt ekleyebilirsiniz.</p>
          <Link href={`/personel-hareketleri/${sicil_no}/degistir`}
            className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700">
            Değiştir
          </Link>
        </div>
      </div>
    )
  }

  let kadroLabel = hareket.kadro_sira_no ?? '—'
  if (hareket.kadro_sira_no) {
    const { data: khRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil')
      .eq('kadro_sira_no', hareket.kadro_sira_no)
    const kh = (khRows ?? []).find(
      (r: { asil: string | null; vekil: string | null }) =>
        (r.asil ?? '').trim() === sicil_no || (r.vekil ?? '').trim() === sicil_no
    ) ?? (khRows ?? [])[0]
    if (kh) {
      const unvan = (kh as { gorev_unvani?: string; kadro_unvani?: string }).gorev_unvani ?? (kh as { kadro_unvani?: string }).kadro_unvani ?? ''
      const mud = (kh as { kadro_mudurlugu?: string; gorev_mudurlugu?: string }).kadro_mudurlugu ?? (kh as { gorev_mudurlugu?: string }).gorev_mudurlugu ?? ''
      const rol = ((kh as { asil?: string }).asil ?? '').trim() === sicil_no ? 'Asil' : ((kh as { vekil?: string }).vekil ?? '').trim() === sicil_no ? 'Vekil' : ''
      kadroLabel = `${hareket.kadro_sira_no} – ${unvan} (${mud})${rol ? ' – ' + rol : ''}`
    }
  }

  const teklifAd = hareket.teklif_eden
    ? (await supabase.from('calisan').select('ad_soyad').eq('sicil_no', hareket.teklif_eden).maybeSingle()).data?.ad_soyad ?? hareket.teklif_eden
    : ''

  const ogrenimDurumu = (ogrenimRows ?? [])[0]?.ogrenim_turu ?? null

  return (
    <PersonelHareketiGoruntuleClient
      personel={calisan as Calisan}
      hareket={hareket}
      kadroLabel={kadroLabel}
      teklifEdenAd={teklifAd}
      ogrenimDurumu={ogrenimDurumu}
    />
  )
}
