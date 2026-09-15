'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ExcelJS from 'exceljs'
import {
  KAZANC_ALANLARI,
  type KazancAlanKey,
  type KazancSapmaSatir,
  type KazancTanimsizSatir,
} from '@/lib/kazanc-sapma'
import { teknisyenOgrenimUyumEtiket } from '@/lib/kazanc-teknisyen-ek-gosterge'

const NEDEN_ETIKET: Record<KazancTanimsizSatir['neden'], string> = {
  unvan_yok: 'Kadro ünvanı eşleşmiyor',
  ogrenim_yok: 'Aktif öğrenim kaydı yok',
  derece_yok: 'KHA derecesi okunamadı',
  tanim_yok: 'Kazanç tanımı girilmemiş',
}

const TH_CLASS =
  'sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-3 py-3 font-semibold text-slate-600 shadow-[0_1px_0_0_rgb(226,232,240)]'

const TABLO_KUTU =
  'bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[min(70vh,40rem)]'

interface Props {
  mod?: 'sapma' | 'uyusan'
  sapanlar?: KazancSapmaSatir[]
  uyusanlar?: KazancSapmaSatir[]
  tanimsizlar?: KazancTanimsizSatir[]
  kontrolEdilen: number
  toplamPersonel: number
}

export default function KazancSapmaClient({
  mod = 'sapma',
  sapanlar = [],
  uyusanlar = [],
  tanimsizlar = [],
  kontrolEdilen,
  toplamPersonel,
}: Props) {
  const satirlar = mod === 'uyusan' ? uyusanlar : sapanlar
  const uyum = mod === 'uyusan'
  const [arama, setArama] = useState('')
  const [unvanFiltre, setUnvanFiltre] = useState('')
  const [alanFiltre, setAlanFiltre] = useState<'' | KazancAlanKey>('')

  const unvanSecenekleri = useMemo(
    () =>
      [...new Set(satirlar.map(s => s.unvan_adi ?? '—'))].sort((a, b) => a.localeCompare(b, 'tr')),
    [satirlar],
  )

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr')
    return satirlar.filter(s => {
      if (unvanFiltre && (s.unvan_adi ?? '—') !== unvanFiltre) return false
      if (alanFiltre && !uyum && !s.alanlar[alanFiltre].farkli) return false
      if (!q) return true
      return `${s.sicil_no} ${s.ad_soyad ?? ''}`.toLocaleLowerCase('tr').includes(q)
    })
  }, [satirlar, arama, unvanFiltre, alanFiltre, uyum])

  const alanSayaclari = useMemo(() => {
    const m = {} as Record<KazancAlanKey, number>
    for (const { key } of KAZANC_ALANLARI) m[key] = satirlar.filter(s => s.alanlar[key].farkli).length
    return m
  }, [satirlar])

  async function excelIndir() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(uyum ? 'Tanımla Uyuşanlar' : 'Tanımdan Sapanlar')
    ws.addRow([
      'Sicil',
      'Ad Soyad',
      'Ünvan',
      'Öğrenim',
      'Öğrenim uyumu',
      'Teknik Öğrenim',
      'Kadro Derecesi',
      'KHA Derecesi',
      'Kıdem Yılı',
      'Yan Ödeme kuralı',
      ...KAZANC_ALANLARI.flatMap(a => [`${a.etiket} (personel)`, `${a.etiket} (tanım)`]),
    ]).font = { bold: true }
    for (const s of filtreli) {
      ws.addRow([
        s.sicil_no,
        s.ad_soyad ?? '',
        s.unvan_adi ?? '',
        s.ogrenim_turu ?? '',
        teknisyenOgrenimUyumEtiket(s.ogrenim_uyum) ?? '',
        s.teknik_ogrenim ? 'Evet' : '',
        s.kadro_derecesi ?? '',
        s.derece,
        s.kidem_yili ?? '',
        s.alanlar.yan_odeme.aciklama ?? s.yan_odeme_kural,
        ...KAZANC_ALANLARI.flatMap(a => [s.alanlar[a.key].mevcut ?? '—', s.alanlar[a.key].tanim ?? '—']),
      ])
    }
    ws.columns.forEach(c => {
      c.width = 16
    })

    if (tanimsizlar.length) {
      const ws2 = wb.addWorksheet('Tanımı Bulunamayanlar')
      ws2.addRow(['Sicil', 'Ad Soyad', 'Ünvan', 'Öğrenim', 'Kadro Derecesi', 'KHA Derecesi', 'Neden']).font = { bold: true }
      for (const t of tanimsizlar) {
        ws2.addRow([t.sicil_no, t.ad_soyad ?? '', t.unvan_adi ?? '', t.ogrenim_turu ?? '', t.kadro_derecesi ?? '', t.derece ?? '', NEDEN_ETIKET[t.neden]])
      }
      ws2.columns.forEach(c => {
        c.width = 20
      })
    }

    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = uyum ? 'kazanc-tanim-uyusan.xlsx' : 'kazanc-tanim-sapma.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/tanimlar/kazanc-bilgi" className="text-sm text-slate-500 hover:text-slate-700">
            ← Kazanç Bilgileri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {uyum ? 'Tanımla Uyuşan Personel' : 'Tanımdan Sapan Personel'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            {uyum ? (
              <>
                Tanımı bulunan ve tüm kazanç alanları tanıma uyan aktif memurlar. Yan ödemede iki sütun veya TKY varsa
                kural kısa etiketi görünür: <span className="font-medium">Bilgisayarlı</span>,{' '}
                <span className="font-medium">Bilgisayarsız</span>, <span className="font-medium">−5 Yıl</span>,{' '}
                <span className="font-medium">+5 Yıl</span>, <span className="font-medium">TKY Görevi</span>.
                Teknisyen kadrosunda yüksek öğrenimli personelde kazanç kaynağı yeşil çerçevede belirtilir:{' '}
                <span className="font-medium">Öğrenim Uyumlu (Tekniker)</span> veya{' '}
                <span className="font-medium">Öğrenim Uyumlu (Mühendis)</span> — ÖHT ve yan ödeme kariyer
                unvanından; ek gösterge, ek ödeme ve SDS teknisyende kalır.{' '}
                <span className="font-medium">Öğrenim Uyumsuz</span> — yalnızca ek gösterge Bilgisayar
                İşletmeni tanımından.
                Tekniker kadrosunda varsayılan öğrenimde <span className="font-medium">Teknik Öğrenim</span> tiki varsa
                ek gösterge Kimyager, yan ödeme Kütüphaneci tanımından alınır.
              </>
            ) : (
              <>
                Aktif memurların terfi kayıtlarındaki kazanç değerleri, kadro ünvanı + öğrenim + KHA derecesi için tanımlı
                satırla karşılaştırılır. TH sınıfında yan ödeme kıdem yılına göre kontrol edilir: 0–4 yıl{' '}
                <span className="font-medium">−5 Yıl</span>, 5–25 yıl <span className="font-medium">+5 Yıl</span>.
                V.H.K.İ. ve Bilgisayar İşletmeni için Yetkinlik Bildirimi esas alınır:{' '}
                <span className="font-medium">Bilgisayarlı</span> / <span className="font-medium">Bilgisayarsız</span>.
                TKY görevi kadro puanını açıklıyorsa kişi sapmada yer almaz. Sapma tek başına hata anlamına gelmez.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void excelIndir()}
          className="shrink-0 text-sm font-medium border border-slate-300 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm">
          Excel indir
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Kutu baslik="Karşılaştırılan" deger={kontrolEdilen} alt={`${toplamPersonel} aktif memur`} />
        {uyum ? (
          <Kutu baslik="Tanımla uyuşan" deger={satirlar.length} vurgu="green" />
        ) : (
          <Kutu baslik="Tanımdan sapan" deger={satirlar.length} vurgu="amber" />
        )}
        {!uyum && (
          <Kutu baslik="Tanımı bulunamayan" deger={tanimsizlar.length} vurgu={tanimsizlar.length ? 'red' : undefined} />
        )}
        {!uyum && (
          <Kutu
            baslik="En çok sapan alan"
            deger={
              KAZANC_ALANLARI.reduce((en, a) => (alanSayaclari[a.key] > alanSayaclari[en.key] ? a : en), KAZANC_ALANLARI[0])
                .etiket
            }
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Sicil veya ad soyad ara…"
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 min-w-[16rem]"
        />
        <select
          value={unvanFiltre}
          onChange={e => setUnvanFiltre(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2">
          <option value="">Tüm ünvanlar</option>
          {unvanSecenekleri.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {!uyum && (
          <select
            value={alanFiltre}
            onChange={e => setAlanFiltre(e.target.value as '' | KazancAlanKey)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2">
            <option value="">Tüm alanlar</option>
            {KAZANC_ALANLARI.map(a => (
              <option key={a.key} value={a.key}>
                {a.etiket} ({alanSayaclari[a.key]})
              </option>
            ))}
          </select>
        )}
        <span className="text-sm text-slate-500 self-center">{filtreli.length} kayıt</span>
      </div>

      <div className={TABLO_KUTU}>
        <table className="w-full text-sm min-w-[68rem] border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr className="text-left">
              <th className={`${TH_CLASS} min-w-[12rem]`}>Sicil — Ad Soyad</th>
              <th className={`${TH_CLASS} min-w-[10rem]`}>Ünvan</th>
              <th className={TH_CLASS}>Öğrenim</th>
              <th
                className={`${TH_CLASS} text-center whitespace-nowrap`}
                title="Kadro hareketlerindeki kadro derecesi">
                Kadro Derecesi
              </th>
              <th
                className={`${TH_CLASS} text-center whitespace-nowrap`}
                title="Kazanılmış hak aylığı derecesi (terfi hareketleri)">
                KHA Derecesi
              </th>
              <th className={`${TH_CLASS} text-center whitespace-nowrap`}>Kıdem Yılı</th>
              {KAZANC_ALANLARI.map(a => (
                <th key={a.key} className={`${TH_CLASS} text-center whitespace-nowrap`}>
                  {a.etiket}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={6 + KAZANC_ALANLARI.length} className="px-4 py-12 text-center text-slate-400">
                  Filtreye uyan kayıt yok.
                </td>
              </tr>
            )}
            {filtreli.map(s => {
              const ogrenimUyumYazi = uyum ? teknisyenOgrenimUyumEtiket(s.ogrenim_uyum) : null
              const teknikOgrenimYazi = s.teknik_ogrenim ? 'Teknik Öğrenim' : null
              return (
              <tr key={s.sicil_no} className="hover:bg-slate-50/80 align-top">
                <td className="px-3 py-2">
                  <span className="text-xs text-slate-400 tabular-nums">{s.sicil_no}</span>
                  <p className="font-medium text-slate-800">{s.ad_soyad ?? '—'}</p>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {s.unvan_id != null ? (
                    <Link href={`/tanimlar/kazanc-bilgi/${s.unvan_id}`} className="hover:underline">
                      {s.unvan_adi ?? '—'}
                    </Link>
                  ) : (
                    (s.unvan_adi ?? '—')
                  )}
                  {s.kazanc_derece_kural ? (
                    <span className="mt-1 block rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-indigo-900 w-fit">
                      {s.kazanc_derece_kural}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <p>{s.ogrenim_turu ?? '—'}</p>
                  {ogrenimUyumYazi ? (
                    <span className="mt-1 inline-block rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-emerald-900">
                      {ogrenimUyumYazi}
                    </span>
                  ) : null}
                  {teknikOgrenimYazi ? (
                    <span className="mt-1 ml-1 inline-block rounded border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-teal-900">
                      {teknikOgrenimYazi}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-700">{s.kadro_derecesi?.trim() || '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-700">{s.derece}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-700">{s.kidem_yili ?? '—'}</td>
                {KAZANC_ALANLARI.map(a => {
                  const v = s.alanlar[a.key]
                  const alanNot =
                    a.key === 'yan_odeme'
                      ? (v.aciklama ??
                          (s.yan_odeme_kural !== 'Yan Ödeme' ? s.yan_odeme_kural : null))
                      : a.key === 'sds_orani'
                        ? (v.aciklama ?? null)
                        : null
                  return (
                    <td key={a.key} className="px-3 py-2 text-center whitespace-nowrap">
                      {v.farkli ? (
                        <span
                          className="inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-1 text-xs leading-tight text-amber-900"
                          title={`Personelde ${v.mevcut ?? '—'}, tanımda ${v.tanim ?? '—'}${alanNot ? ` (${alanNot})` : ''}`}>
                          <span className="block font-semibold">{v.mevcut ?? '—'}</span>
                          <span className="block text-[11px] font-normal opacity-80">tanım: {v.tanim ?? '—'}</span>
                          {alanNot ? (
                            <span className="block text-[10px] font-normal opacity-70 mt-0.5">{alanNot}</span>
                          ) : null}
                        </span>
                      ) : uyum && alanNot ? (
                        <span className="inline-block rounded border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-xs leading-tight text-emerald-900">
                          <span className="block font-semibold">{v.mevcut ?? '—'}</span>
                          <span className="block text-[10px] font-normal opacity-80 mt-0.5">{alanNot}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {v.mevcut ?? '—'}
                          {alanNot ? (
                            <span className="block text-[10px] opacity-70">{alanNot}</span>
                          ) : null}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
            })}
          </tbody>
        </table>
      </div>

      {!uyum && tanimsizlar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-800">Kazanç Tanımı Bulunamayan Personel</h2>
          <p className="text-sm text-slate-500 mt-0.5 mb-4 max-w-3xl">
            Bu personel için ünvan + öğrenim + derece üçlüsüne karşılık gelen tanım yok. Terfide dereceleri ilerlerse
            kazanç değerleri eski derecede kalır; Terfi Ettir önizlemesi bu satırları uyarı rozetiyle işaretler.
          </p>
          <div className={TABLO_KUTU}>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr className="text-left">
                  <th className={TH_CLASS}>Sicil — Ad Soyad</th>
                  <th className={TH_CLASS}>Ünvan</th>
                  <th className={TH_CLASS}>Öğrenim</th>
                  <th
                    className={`${TH_CLASS} text-center whitespace-nowrap`}
                    title="Kadro hareketlerindeki kadro derecesi">
                    Kadro Derecesi
                  </th>
                  <th
                    className={`${TH_CLASS} text-center whitespace-nowrap`}
                    title="Kazanılmış hak aylığı derecesi (terfi hareketleri)">
                    KHA Derecesi
                  </th>
                  <th className={TH_CLASS}>Neden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tanimsizlar.map(t => (
                  <tr key={t.sicil_no} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-400 tabular-nums">{t.sicil_no}</span>
                      <p className="font-medium text-slate-800">{t.ad_soyad ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {t.unvan_id != null ? (
                        <Link href={`/tanimlar/kazanc-bilgi/${t.unvan_id}`} className="hover:underline">
                          {t.unvan_adi ?? '—'}
                        </Link>
                      ) : (
                        (t.unvan_adi ?? '—')
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{t.ogrenim_turu ?? '—'}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-700">{t.kadro_derecesi?.trim() || '—'}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-700">{t.derece ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-red-50 border border-red-200 px-2 py-1 text-xs font-medium text-red-800">
                        {NEDEN_ETIKET[t.neden]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function Kutu({
  baslik,
  deger,
  alt,
  vurgu,
}: {
  baslik: string
  deger: string | number
  alt?: string
  vurgu?: 'amber' | 'red' | 'green'
}) {
  const renk =
    vurgu === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
      : vurgu === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : vurgu === 'green'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-800'
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${renk}`}>
      <p className="text-xs font-medium opacity-70">{baslik}</p>
      <p className="text-xl font-bold mt-0.5 leading-tight">{deger}</p>
      {alt && <p className="text-[11px] opacity-70 mt-0.5">{alt}</p>}
    </div>
  )
}
