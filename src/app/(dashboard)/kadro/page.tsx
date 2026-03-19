import { createClient } from '@/lib/supabase/server'
import KadroListClient from '@/components/kadro/KadroListClient'
import { kadroEkle, kadroGuncelle } from './actions'
import type { Tables } from '@/types/database'

export default async function KadroPage() {
  const supabase = await createClient()

  const [{ data: kadroRaw, error }, { data: calisanRaw }, { data: statuRaw }, { data: mudurRaw }, { data: unvanRaw }] =
    await Promise.all([
      supabase.from('kadro_hareketleri').select('*').order('kadro_sira_no'),
      supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
      supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
      supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
      supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('sira_no').order('unvan_adi'),
    ])

  const kadroData = (kadroRaw ?? []) as Tables<'kadro_hareketleri'>[]
  const GELIS_NEDENLERI = ['Açıktan Atama', 'Nakil Gelme', 'İstifa Dönüş', 'Askerlik Dönüş', 'Doğum İzni Dönüş', 'Ücretsiz İzin Dönüş']
  const AYRILIS_VARSAYILAN = ['İstifa', 'Emeklilik', 'Ölüm', 'Nakil', 'Kadro Kaldırıldı', 'Görevden Alınma']
  const gelisMevcut = [...new Set(kadroData.map(k => k.gelis_nedeni).filter(Boolean))] as string[]
  const gelisNedenleri = [...new Set([...GELIS_NEDENLERI, ...gelisMevcut])].sort((a, b) => a.localeCompare(b, 'tr'))
  const ayrilisMevcut = [...new Set(kadroData.map(k => k.ayrilis_nedeni).filter(Boolean))] as string[]
  ayrilisMevcut.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))
  const ayrilisNedenleri = ayrilisMevcut.length ? ayrilisMevcut : AYRILIS_VARSAYILAN

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <KadroListClient
        data={kadroData}
        personeller={(calisanRaw ?? []) as { sicil_no: string; ad_soyad: string }[]}
        statuler={(statuRaw ?? []).map(s => s.statu_adi)}
        mudurluler={(mudurRaw ?? []).map(m => m.mudurluk_adi)}
        unvanlar={(unvanRaw ?? []).map(u => ({ id: u.id, unvan_adi: u.unvan_adi }))}
        gelisNedenleri={gelisNedenleri}
        ayrilisNedenleri={ayrilisNedenleri}
        onEkle={kadroEkle}
        onGuncelle={kadroGuncelle}
      />
    </>
  )
}
