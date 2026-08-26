import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import KadroDuzenleClient from '@/components/kadro/KadroDuzenleClient'
import { kadroGuncelle } from '../../actions'
import type { Tables } from '@/types/database'

export default async function KadroDuzenlePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) notFound()

  const [
    { data: k, error },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: statuRaw },
    { data: mudurRaw },
    { data: unvanRaw },
  ] = await Promise.all([
    supabase.from('kadro_hareketleri').select('*').eq('id', idNum).single(),
    fetchAllKadroHareketleri(supabase, 'gelis_nedeni, ayrilis_nedeni'),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi, sinif_adi').eq('aktif', true).order('sira_no').order('unvan_adi'),
  ])

  if (error || !k) notFound()
  const row = k as Tables<'kadro_hareketleri'>

  const GELIS_NEDENLERI = ['Açıktan Atama', 'Nakil Gelme', 'İstifa Dönüş', 'Askerlik Dönüş', 'Doğum İzni Dönüş', 'Ücretsiz İzin Dönüş']
  const AYRILIS_VARSAYILAN = ['İstifa', 'Emeklilik', 'Ölüm', 'Nakil', 'Kadro Kaldırıldı', 'Görevden Alınma']
  const gelisMevcut = [...new Set((kadroRaw ?? []).map((r: { gelis_nedeni: string | null }) => r.gelis_nedeni).filter(Boolean))] as string[]
  const gelisNedenleri = [...new Set([...GELIS_NEDENLERI, ...gelisMevcut])].sort((a, b) => a.localeCompare(b, 'tr'))
  const ayrilisMevcut = [...new Set((kadroRaw ?? []).map((r: { ayrilis_nedeni: string | null }) => r.ayrilis_nedeni).filter(Boolean))] as string[]
  ayrilisMevcut.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))
  const ayrilisNedenleri = ayrilisMevcut.length ? ayrilisMevcut : AYRILIS_VARSAYILAN

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/kadro" className="hover:text-slate-800 transition-colors">
          Kadro Hareketleri
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/kadro/${id}`} className="hover:text-slate-800 transition-colors">
          {row.kadro_unvani ?? row.kadro_sira_no ?? `#${id}`}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Düzenle</span>
      </nav>

      <KadroDuzenleClient
        row={row}
        personeller={(calisanRaw ?? []) as { sicil_no: string; ad_soyad: string }[]}
        statuler={(statuRaw ?? []).map((s: { statu_adi: string }) => s.statu_adi)}
        mudurluler={(mudurRaw ?? []).map((m: { mudurluk_adi: string }) => m.mudurluk_adi)}
        unvanlar={(unvanRaw ?? []).map((u: { id: number; unvan_adi: string; sinif_adi: string | null }) => ({
          id: u.id,
          unvan_adi: u.unvan_adi,
          sinif_adi: u.sinif_adi ?? null,
        }))}
        gelisNedenleri={gelisNedenleri}
        ayrilisNedenleri={ayrilisNedenleri}
        onGuncelle={kadroGuncelle}
      />
    </div>
  )
}
