'use client'

import Link from 'next/link'
import { toGgAayyyy } from '@/lib/tarih'
import type { Tables } from '@/types/database'
import {
  PERSONEL_HAREKET_SABLON_SAYFA,
  PERSONEL_HAREKET_SABLON_URL,
  personelHareketExcelDoldurExcelJs,
  personelHareketFormVerisiKayittan,
} from '@/lib/personel-hareket-belge'

type Calisan = Tables<'calisan'>
type PH = Tables<'personel_hareketleri'>

const HAREKET_TIPI_LABEL: Record<string, string> = {
  IlkAtanma: 'İlk Atanma',
  YerDegistirme: 'Yer Değiştirme',
  Yukselme: 'Yükselme',
}

function AlanGoster({ etiket, deger }: { etiket: string; deger?: string | null }) {
  return (
    <div>
      <span className="text-slate-400 text-xs block">{etiket}</span>
      <span className="text-slate-700">{deger || '—'}</span>
    </div>
  )
}

function tarih(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

interface Props {
  personel: Calisan
  hareket: PH
  kadroLabel: string
  teklifEdenAd: string
  ogrenimDurumu?: string | null
  degistirHref: string
}

export default function PersonelHareketiGoruntuleClient({
  personel,
  hareket,
  kadroLabel,
  teklifEdenAd,
  ogrenimDurumu = null,
  degistirHref,
}: Props) {
  const dogumYeri = personel.dogum_yeri ?? ''
  const dogumTarihi = toGgAayyyy(personel.dogum_tarihi)
  const dogumYeriTarihi = [dogumYeri, dogumTarihi].filter(Boolean).join(' ')

  async function handleExcelIndir() {
    try {
      const veri = personelHareketFormVerisiKayittan({
        personel,
        hareket,
        dogumYeriTarihi,
        ogrenimDurumu,
        teklifEdenAd,
      })
      const ExcelJS = (await import('exceljs')).default
      const resp = await fetch(PERSONEL_HAREKET_SABLON_URL)
      if (!resp.ok) return
      const buffer = await resp.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)
      const ws = wb.getWorksheet(PERSONEL_HAREKET_SABLON_SAYFA) ?? wb.worksheets[0]
      if (!ws) return
      personelHareketExcelDoldurExcelJs(ws, veri)
      const out = await wb.xlsx.writeBuffer()
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personel-hareketi-${personel.sicil_no}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // sessiz kal: görüntüleme ekranında indirmenin ana akışı bozulmasın
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Personel Hareketi - Görüntüle</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExcelIndir}
            className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50"
          >
            Excel İndir
          </button>
          <Link href={degistirHref}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Değiştir
          </Link>
          <Link href="/personel-hareketleri"
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Listeye Dön
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Hareket Tipi</h2>
          <p className="text-slate-700">
            {HAREKET_TIPI_LABEL[hareket.hareket_tipi ?? ''] ?? hareket.hareket_tipi ?? '—'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Kişisel Bilgiler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AlanGoster etiket="1. Adı, Soyadı" deger={personel.ad_soyad ?? ''} />
            <AlanGoster etiket="2. Sicil No" deger={personel.sicil_no} />
            <AlanGoster etiket="3. Doğum Yeri ve Tarihi" deger={dogumYeriTarihi} />
            <AlanGoster etiket="4. Yürürlük Tarihi" deger={tarih(hareket.yururluk_tarihi)} />
            <AlanGoster etiket="5. Adaylık Süresi" deger={hareket.adaylik_suresi} />
            <AlanGoster etiket="6. Asli Memurluğa Atanma Tarihi" deger={tarih(hareket.asli_memuriyete_atanma_tarihi)} />
            <AlanGoster etiket="7. Öğrenim Durumu" deger={ogrenimDurumu ?? ''} />
            <AlanGoster etiket="8. Askerlik Durumu" deger={personel.askerlik_durumu ?? ''} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">İşlem yapılacak kadro</h2>
          <p className="text-slate-700">{kadroLabel}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Durum Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">ESKİ</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { l: 'Görev Yeri', v: hareket.eski_gorev_yeri },
                  { l: 'Unvanı', v: hareket.eski_unvan },
                  { l: 'Sınıfı', v: hareket.eski_sinif },
                  { l: 'Kadro derecesi', v: hareket.eski_kadro_derecesi },
                  { l: 'KHA Derece', v: hareket.eski_kha_derece },
                  { l: 'KHA Kademe', v: hareket.eski_kha_kademe },
                  { l: 'EKEA Derece', v: hareket.eski_ekea_derece },
                  { l: 'EKEA Kademe', v: hareket.eski_ekea_kademe },
                  { l: 'Kıdem Yılı', v: hareket.eski_kidem_yili },
                  { l: 'ÖHT', v: hareket.eski_oht },
                  { l: 'Yan Ödeme', v: hareket.eski_igz },
                  { l: 'Ek Ödeme', v: hareket.eski_ek_odeme },
                  { l: 'Ek Gösterge', v: hareket.eski_ek_gosterge },
                ].map(({ l, v }) => (
                  <AlanGoster key={l} etiket={l} deger={v} />
                ))}
              </div>
            </div>
            <div className="bg-indigo-50/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-indigo-600 uppercase mb-3">YENİ</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { l: 'Görev Yeri', v: hareket.yeni_gorev_yeri },
                  { l: 'Unvanı', v: hareket.yeni_unvan },
                  { l: 'Sınıfı', v: hareket.yeni_sinif },
                  { l: 'Kadro derecesi', v: hareket.yeni_kadro_derecesi },
                  { l: 'KHA Derece', v: hareket.yeni_kha_derece },
                  { l: 'KHA Kademe', v: hareket.yeni_kha_kademe },
                  { l: 'EKEA Derece', v: hareket.yeni_ekea_derece },
                  { l: 'EKEA Kademe', v: hareket.yeni_ekea_kademe },
                  { l: 'Kıdem Yılı', v: hareket.yeni_kidem_yili },
                  { l: 'ÖHT', v: hareket.yeni_oht },
                  { l: 'Yan Ödeme', v: hareket.yeni_igz },
                  { l: 'Ek Ödeme', v: hareket.yeni_ek_odeme },
                  { l: 'Ek Gösterge', v: hareket.yeni_ek_gosterge },
                ].map(({ l, v }) => (
                  <AlanGoster key={l} etiket={l} deger={v} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AlanGoster etiket="Dayanağı" deger={hareket.dayanak} />
            <AlanGoster etiket="Açıklama" deger={hareket.aciklama} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AlanGoster etiket="16. Teklif eden" deger={teklifEdenAd} />
            <AlanGoster etiket="17. Onaylayan (Belediye Başkanı)" deger={hareket.onaylayan} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AlanGoster etiket="İşe başladığı tarih" deger={tarih(hareket.ise_baslama_tarihi)} />
            <AlanGoster etiket="Ayrıldığı tarih" deger={tarih(hareket.ayrilis_tarihi)} />
            <AlanGoster etiket="Ayrılış Nedeni" deger={hareket.ayrilis_nedeni} />
            <AlanGoster etiket="Kayıt Tarihi" deger={tarih(hareket.kayit_tarihi)} />
            <AlanGoster etiket="Kayıt No" deger={hareket.kayit_no} />
            <AlanGoster etiket="Yürürlük Tarihi" deger={tarih(hareket.yururluk_tarihi)} />
          </div>
          {hareket.dagitim_mudurlukleri && (
            <div className="mt-3">
              <AlanGoster etiket="Dağıtım (Müdürlükler)" deger={hareket.dagitim_mudurlukleri} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
