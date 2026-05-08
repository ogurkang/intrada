import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { terfiTarihPenceresiOncekiDonem } from '@/lib/terfi-donem-aralik'
import { buildTerfiEttirOnizleme, type TerfiEttirOnizlemeSatir, type TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import TerfiEttirClient from '@/components/terfi/TerfiEttirClient'
import { terfiGeriAlTek, terfiGeriAlToplu } from '@/app/(dashboard)/terfi/donem/actions'

function satirKaynaktan(k: TerfiKaynak): TerfiEttirOnizlemeSatir | null {
  if (!k.terfi_id) return null
  const kd = k.kha_derece ?? '—'
  const kk = k.kha_kademe ?? '—'
  const ed = k.ekea_derece ?? '—'
  const ek = k.ekea_kademe ?? '—'
  return {
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    unvan_adi: k.unvan_adi,
    kadro_derecesi: k.kadro_derecesi,
    ogrenim_turu: k.ogrenim_turu,
    kha_tarihi: k.kha_tarihi,
    ekea_tarihi: k.ekea_tarihi,
    kidem_tarihi_eski: k.kidem_tarihi ?? '—',
    kidem_tarihi_yeni: k.kidem_tarihi ?? '—',
    iyi_hal_tarihi_eski: k.iyi_hal_terfi_tarihi ?? '—',
    iyi_hal_tarihi_yeni: k.iyi_hal_terfi_tarihi ?? '—',
    kidem_yili_eski: k.kidem_yili ?? '—',
    kidem_yili_yeni: k.kidem_yili ?? '—',
    dk_kha_eski: `${kd}/${kk}`,
    dk_kha_yeni: `${kd}/${kk}`,
    dk_ekea_eski: `${ed}/${ek}`,
    dk_ekea_yeni: `${ed}/${ek}`,
    ek_gosterge_eski: k.ek_gosterge ?? '—',
    ek_gosterge_yeni: k.ek_gosterge ?? '—',
    ek_odeme_eski: k.ek_odeme ?? '—',
    ek_odeme_yeni: k.ek_odeme ?? '—',
    oht_eski: k.oht ?? '—',
    oht_yeni: k.oht ?? '—',
    yan_odeme_eski: k.yan_odeme ?? '—',
    yan_odeme_yeni: k.yan_odeme ?? '—',
    sds_eski: k.sds_orani ?? '—',
    sds_yeni: k.sds_orani ?? '—',
    durum: '—',
    terfi_id: k.terfi_id,
    payload: {
      kha_derece: k.kha_derece,
      kha_kademe: k.kha_kademe,
      ekea_derece: k.ekea_derece,
      ekea_kademe: k.ekea_kademe,
      kha_tarihi: k.kha_tarihi,
      ekea_tarihi: k.ekea_tarihi,
      kidem_tarihi: k.kidem_tarihi,
      kidem_yili: k.kidem_yili,
      iyi_hal_terfi_tarihi: k.iyi_hal_terfi_tarihi,
      ek_gosterge: k.ek_gosterge,
      ek_odeme: k.ek_odeme,
      oht: k.oht,
      yan_odeme: k.yan_odeme,
      sds_orani: k.sds_orani,
    },
  }
}

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
  const { data: logRows } = await supabase
    .from('terfi_donem_islem_log')
    .select('id, sicil_no, islem_tarihi, geri_alindi')
    .eq('donem_id', id)
    .order('islem_tarihi', { ascending: false })
  const aktifLogSicilleri = new Set((logRows ?? []).filter(x => !x.geri_alindi).map(x => x.sicil_no))
  const mevcutSiciller = new Set(initialRows.map(r => r.sicil_no))
  const ekSatirlar = kaynaklar
    .filter(k => aktifLogSicilleri.has(k.sicil_no) && !mevcutSiciller.has(k.sicil_no))
    .map(satirKaynaktan)
    .filter((x): x is TerfiEttirOnizlemeSatir => x != null)
  const initialRowsFinal = [...initialRows, ...ekSatirlar]

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
        initialRows={initialRowsFinal}
        islemLoglari={
          (logRows ?? []).map(x => ({
            id: x.id,
            sicil_no: x.sicil_no,
            islem_tarihi: x.islem_tarihi,
            geri_alindi: x.geri_alindi,
          }))
        }
        onGeriAlTek={terfiGeriAlTek}
        onGeriAlToplu={terfiGeriAlToplu}
      />
    </div>
  )
}
