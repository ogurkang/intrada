import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { terfiTarihPenceresiOncekiDonem } from '@/lib/terfi-donem-aralik'
import { buildTerfiEttirOnizleme, type TerfiEttirDurumEtiket, type TerfiEttirOnizlemeSatir, type TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { ogrenimOlayEtiket, type TerfiOgrenimOlayTipi } from '@/lib/terfi-ogrenim-ettir'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import TerfiEttirClient from '@/components/terfi/TerfiEttirClient'
import { terfiGeriAlTek, terfiGeriAlToplu } from '@/app/(dashboard)/terfi/donem/actions'

type LogSnap = {
  kha_derece?: string | null
  kha_kademe?: string | null
  ekea_derece?: string | null
  ekea_kademe?: string | null
  kha_tarihi?: string | null
  ekea_tarihi?: string | null
  kidem_tarihi?: string | null
  kidem_yili?: string | null
  iyi_hal_terfi_tarihi?: string | null
  ek_gosterge?: string | null
  ek_odeme?: string | null
  oht?: string | null
  yan_odeme?: string | null
  sds_orani?: string | null
}

function snapDK(snap: LogSnap, tip: 'kha' | 'ekea'): string {
  const d = tip === 'kha' ? snap.kha_derece : snap.ekea_derece
  const k = tip === 'kha' ? snap.kha_kademe : snap.ekea_kademe
  return `${d ?? '—'}/${k ?? '—'}`
}

function ds(v: string | null | undefined): string {
  return v ?? '—'
}

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

  const { kaynaklar, kazancLookup, kazancEntries, tanimOgList, memurPersoneller } =
    await yukleTerfiEttirKaynakVeKazanc(supabase)
  const initialRows = buildTerfiEttirOnizleme(kaynaklar, bas, bit, kazancLookup)
  const { data: logRows } = await supabase
    .from('terfi_donem_islem_log')
    .select('id, sicil_no, islem_tarihi, geri_alindi, onceki, sonraki, terfi_id, ogrenim_terfi, ogrenim_olay')
    .eq('donem_id', id)
    .order('islem_tarihi', { ascending: false })

  const aktifLoglar = (logRows ?? []).filter(x => !x.geri_alindi)
  const aktifLogSicilleri = new Set(aktifLoglar.map(x => x.sicil_no))
  // Aktif log'u olan (terfi ettirilmiş) personeli önizlemeden çıkar
  const initialRowsFinal = initialRows.filter(r => !aktifLogSicilleri.has(r.sicil_no))

  // Terfi ettirilmiş kişilerden Excel için satır üret (onceki → sonraki snapshot)
  const kaynakBySicil = new Map(kaynaklar.map(k => [k.sicil_no, k]))

  // Orijinal terfi sebebini (durum) yeniden türet: onceki snapshot değerleriyle
  // buildTerfiEttirOnizleme'yi çalıştır — hangi tarih [bas,bit] aralığına düşüyorsa aynı durum hesaplanır
  const oncekiKaynaklar: TerfiKaynak[] = aktifLoglar.map(log => {
    const kaynak = kaynakBySicil.get(log.sicil_no)
    const onc: LogSnap = (log.onceki ?? {}) as LogSnap
    return {
      sicil_no: log.sicil_no,
      ad_soyad: kaynak?.ad_soyad ?? null,
      unvan_adi: kaynak?.unvan_adi ?? null,
      kadro_derecesi: kaynak?.kadro_derecesi ?? null,
      ogrenim_turu: kaynak?.ogrenim_turu ?? null,
      ogrenim_id: kaynak?.ogrenim_id ?? null,
      unvan_id: kaynak?.unvan_id ?? null,
      kha_derece: onc.kha_derece ?? null,
      kha_kademe: onc.kha_kademe ?? null,
      kha_tarihi: onc.kha_tarihi ?? null,
      ekea_derece: onc.ekea_derece ?? null,
      ekea_kademe: onc.ekea_kademe ?? null,
      ekea_tarihi: onc.ekea_tarihi ?? null,
      kidem_yili: onc.kidem_yili ?? null,
      kidem_tarihi: onc.kidem_tarihi ?? null,
      iyi_hal_terfi_tarihi: onc.iyi_hal_terfi_tarihi ?? null,
      ek_gosterge: onc.ek_gosterge ?? null,
      ek_odeme: onc.ek_odeme ?? null,
      oht: onc.oht ?? null,
      yan_odeme: onc.yan_odeme ?? null,
      sds_orani: onc.sds_orani ?? null,
      terfi_id: log.terfi_id ?? null,
    }
  })
  const oncekiOnizleme = buildTerfiEttirOnizleme(oncekiKaynaklar, bas, bit, kazancLookup)
  const durumBySicil = new Map(oncekiOnizleme.map(r => [r.sicil_no, r.durum]))

  const terfiEttirilenSatirlar: TerfiEttirOnizlemeSatir[] = aktifLoglar.map(log => {
    const kaynak = kaynakBySicil.get(log.sicil_no)
    const onc: LogSnap = (log.onceki ?? {}) as LogSnap
    const son: LogSnap = (log.sonraki ?? {}) as LogSnap
    const ogrenimTerfi = !!log.ogrenim_terfi
    const ogrenimOlay = log.ogrenim_olay as TerfiOgrenimOlayTipi | null
    const durum: TerfiEttirDurumEtiket =
      ogrenimTerfi && ogrenimOlay
        ? (ogrenimOlayEtiket(ogrenimOlay) as TerfiEttirDurumEtiket)
        : (durumBySicil.get(log.sicil_no) ?? '—')
    return {
      sicil_no: log.sicil_no,
      ad_soyad: kaynak?.ad_soyad ?? log.sicil_no,
      unvan_adi: kaynak?.unvan_adi ?? null,
      kadro_derecesi: kaynak?.kadro_derecesi ?? null,
      ogrenim_turu: kaynak?.ogrenim_turu ?? null,
      kha_tarihi: onc.kha_tarihi ?? null,
      ekea_tarihi: onc.ekea_tarihi ?? null,
      kidem_tarihi_eski: ds(onc.kidem_tarihi),
      kidem_tarihi_yeni: ds(son.kidem_tarihi),
      iyi_hal_tarihi_eski: ds(onc.iyi_hal_terfi_tarihi),
      iyi_hal_tarihi_yeni: ds(son.iyi_hal_terfi_tarihi),
      kidem_yili_eski: ds(onc.kidem_yili),
      kidem_yili_yeni: ds(son.kidem_yili),
      dk_kha_eski: snapDK(onc, 'kha'),
      dk_kha_yeni: snapDK(son, 'kha'),
      dk_ekea_eski: snapDK(onc, 'ekea'),
      dk_ekea_yeni: snapDK(son, 'ekea'),
      ek_gosterge_eski: ds(onc.ek_gosterge),
      ek_gosterge_yeni: ds(son.ek_gosterge),
      ek_odeme_eski: ds(onc.ek_odeme),
      ek_odeme_yeni: ds(son.ek_odeme),
      oht_eski: ds(onc.oht),
      oht_yeni: ds(son.oht),
      yan_odeme_eski: ds(onc.yan_odeme),
      yan_odeme_yeni: ds(son.yan_odeme),
      sds_eski: ds(onc.sds_orani),
      sds_yeni: ds(son.sds_orani),
      durum,
      terfi_id: log.terfi_id ?? null,
      ogrenim_terfi: ogrenimTerfi || undefined,
      ogrenim_olay: ogrenimOlay ?? undefined,
      payload: {
        kha_derece: son.kha_derece ?? null,
        kha_kademe: son.kha_kademe ?? null,
        ekea_derece: son.ekea_derece ?? null,
        ekea_kademe: son.ekea_kademe ?? null,
        kha_tarihi: son.kha_tarihi ?? null,
        ekea_tarihi: son.ekea_tarihi ?? null,
        kidem_tarihi: son.kidem_tarihi ?? null,
        kidem_yili: son.kidem_yili ?? null,
        iyi_hal_terfi_tarihi: son.iyi_hal_terfi_tarihi ?? null,
        ek_gosterge: son.ek_gosterge ?? null,
        ek_odeme: son.ek_odeme ?? null,
        oht: son.oht ?? null,
        yan_odeme: son.yan_odeme ?? null,
        sds_orani: son.sds_orani ?? null,
      },
    }
  })

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
        terfiEttirilenRows={terfiEttirilenSatirlar}
        kaynaklar={kaynaklar}
        kazancEntries={kazancEntries}
        tanimOgList={tanimOgList}
        memurPersoneller={memurPersoneller}
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
