import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { terfiTarihPenceresiOncekiDonem } from '@/lib/terfi-donem-aralik'
import { buildTerfiEttirOnizleme } from '@/lib/terfi-ettir-hesap'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import TerfiEttirClient from '@/components/terfi/TerfiEttirClient'

export default async function TerfiDonemDetayPage({ params }: { params: Promise<{ donem_id: string }> }) {
  const { donem_id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (Number.isNaN(id)) notFound()

  const supabase = await createClient()
  const { data: row, error } = await supabase.from('terfi_donem').select('*').eq('id', id).single()
  if (error || !row) notFound()

  const d = row as Tables<'terfi_donem'>
  const { bas, bit } = terfiTarihPenceresiOncekiDonem(d.baslangic_tarihi, d.bitis_tarihi)

  const { kaynaklar, kazancLookup } = await yukleTerfiEttirKaynakVeKazanc(supabase)
  const initialRows = buildTerfiEttirOnizleme(kaynaklar, bas, bit, kazancLookup)

  function fmt(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR')
  }

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/terfi" className="hover:text-slate-800 transition-colors">
          Terfi Hareketleri
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Dönem</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{d.donem_adi ?? `Dönem #${d.id}`}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Dönem:{' '}
            <span className="tabular-nums">
              {fmt(d.baslangic_tarihi)} — {fmt(d.bitis_tarihi)}
            </span>
          </p>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">
            Terfi Ettir için kullanılan <strong>KHA / EKEA / Kıdem tarihi</strong> penceresi (bir önceki ay):{' '}
            <span className="tabular-nums font-medium text-slate-700">
              {fmt(bas)} — {fmt(bit)}
            </span>{' '}
            (dahil).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/terfi"
            className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            ← Dönemlere Dön
          </Link>
        </div>
      </div>

      <TerfiEttirClient
        donemId={id}
        donemAdi={d.donem_adi ?? `Dönem ${d.yil}`}
        terfiBas={bas}
        terfiBit={bit}
        initialRows={initialRows}
      />
    </div>
  )
}
