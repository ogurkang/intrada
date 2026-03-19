import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ yil?: string }>
}

function tarihFormatla(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function Alan({ etiket, deger, tam }: { etiket: string; deger?: string | null; tam?: boolean }) {
  return (
    <div className={tam ? 'col-span-full' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{etiket}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 min-h-[36px] whitespace-pre-wrap">
        {deger || <span className="text-slate-400 italic">—</span>}
      </div>
    </div>
  )
}

const DURUM_RENK: Record<string, string> = {
  'Onaylandı':    'bg-green-100 text-green-700',
  'Taslak':       'bg-slate-100 text-slate-600',
  'Değiştirildi': 'bg-amber-100 text-amber-700',
  'İptal Edildi': 'bg-red-100 text-red-600',
}

export default async function IzinGoruntuPage({ params, searchParams }: Props) {
  const { id } = await params
  const { yil: yilParam } = await searchParams
  const yil = yilParam ? parseInt(yilParam, 10) : new Date().getFullYear()
  const listeyeYil = Number.isFinite(yil) ? yil : new Date().getFullYear()
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const supabase = await createClient()

  const [{ data: izin, error }, { data: calisan }] = await Promise.all([
    supabase.from('izin_hareketleri').select('*').eq('id', numId).single(),
    supabase.from('calisan').select('sicil_no, ad_soyad').filter('sicil_no', 'eq', '').limit(0),
  ])

  if (error || !izin) notFound()

  const { data: calisanRow } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', izin.sicil_no)
    .maybeSingle()

  const h = izin as Tables<'izin_hareketleri'>

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İzin Hareketi - Görüntüle</h1>
        <div className="flex items-center gap-2">
          <Link href={`/izin/${h.id}/duzenle`}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Değiştir
          </Link>
          <Link href={`/izin?yil=${listeyeYil}`}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Listeye Dön
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-4 gap-4">
          <Alan etiket="Sıra No"     deger={h.sira_no ? `${h.yil}/${h.sira_no}` : '—'} />
          <Alan etiket="İşlem Yapan" deger={h.islem_yapan} />
          <Alan etiket="Sicil No"    deger={h.sicil_no} />
          <Alan etiket="Adı Soyadı"  deger={calisanRow?.ad_soyad} />
          <Alan etiket="Tür"         deger={h.tur} />
          <Alan etiket="Ayrılış"     deger={tarihFormatla(h.ayrilis)} />
          <Alan etiket="Başlama"     deger={tarihFormatla(h.baslama)} />
          <Alan etiket="Gün"         deger={String(h.gun)} />
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
            <div className="px-3 py-2 min-h-[36px] flex items-center">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[h.durum] ?? 'bg-slate-100 text-slate-600'}`}>
                {h.durum}
              </span>
            </div>
          </div>
          <Alan etiket="Vekalet"    deger={h.vekalet} />
          <Alan etiket="Açıklama"  deger={h.aciklama} tam />
          <Alan etiket="Bilgi"     deger={h.bilgi} tam />
        </div>

      </div>
    </div>
  )
}
