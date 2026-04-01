'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import DashboardAnaSayfaLink from '@/components/ui/DashboardAnaSayfaLink'
import type {
  YevmiyePuantajYukleResult,
  YevmiyeMudurlukData,
  YevmiyePersonel,
  YevmiyeGun,
} from '@/app/(dashboard)/kesintiler/yevmiye/[donem_id]/actions'
import { yevmiyePuantajKaydet } from '@/app/(dashboard)/kesintiler/yevmiye/[donem_id]/actions'
import { PUANTAJ_KOD_ACIKLAMA } from '@/lib/puantaj-kod-aciklama'

interface Props {
  data: YevmiyePuantajYukleResult
  donemId: number
  /** Kullanıcı rolü: üstte Ana sayfa linki */
  showAnaSayfaLink?: boolean
}

export default function YevmiyePuantajClient({ data, donemId, showAnaSayfaLink = false }: Props) {
  const { donem, mudurlukler, statuSekmeleri, kayitOzeti, mudurlukPersonelMap, mudurlukSaltOkunur } = data
  const ilkMud = statuSekmeleri.find(s => s.statu === 'Sözleşmeli')?.mudurlukler[0]?.mudurlukAdi ?? mudurlukler[0] ?? ''
  const [seciliMudurluk, setSeciliMudurluk] = useState<string>(ilkMud)
  const [seciliStatu, setSeciliStatu] = useState<string>('Sözleşmeli')
  const [gunleriIsaretleModu, setGunleriIsaretleModu] = useState(false)
  const [fazlaMesaiLocal, setFazlaMesaiLocal] = useState<Record<string, Record<string, number>>>({})
  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [puantor, setPuantor] = useState('')
  const [birimAmiri, setBirimAmiri] = useState('')
  const [mudur, setMudur] = useState('')

  const statuSekme = statuSekmeleri.find(s => s.statu === seciliStatu)
  // Sadece seçili statüde personeli olan müdürlükler dropdown'da
  const mudurlukListesi = statuSekme?.mudurlukler.map(m => m.mudurlukAdi) ?? []
  const mudurlukSecenekleri = mudurlukListesi.includes(seciliMudurluk)
    ? mudurlukListesi
    : [seciliMudurluk, ...mudurlukListesi]
  // Seçili müdürlük için bu statüdeki veriyi al; müdürlük değişmez (personel yok mesajı gösterilir)
  const mudData = statuSekme?.mudurlukler.find(m => m.mudurlukAdi === seciliMudurluk)
  const personeller = mudData?.personeller ?? []
  const gunler = mudData?.gunler ?? []
  const grid = mudData?.grid ?? {}
  const fazlaMesaiGrid = mudData?.fazlaMesaiGrid ?? {}
  const readonly = donem.durum === 'Kapalı'

  const fmGetir = useCallback((sicil: string, tarih: string): number => {
    if (gunleriIsaretleModu && fazlaMesaiLocal[sicil]?.[tarih] != null) {
      return fazlaMesaiLocal[sicil][tarih]
    }
    return fazlaMesaiGrid[sicil]?.[tarih] ?? 0
  }, [gunleriIsaretleModu, fazlaMesaiLocal, fazlaMesaiGrid])

  const fmGuncelle = useCallback((sicil: string, tarih: string, deger: number) => {
    setFazlaMesaiLocal(prev => {
      const next = { ...prev }
      if (!next[sicil]) next[sicil] = {}
      next[sicil] = { ...next[sicil], [tarih]: deger }
      return next
    })
  }, [])

  const handleKaydet = useCallback(async () => {
    if (readonly) return
    setKaydetYukleniyor(true)
    setHata(null)
    const toSave: Array<{ sicil_no: string; tarih: string; deger: string; saat: number }> = []
    for (const p of personeller) {
      for (const g of gunler) {
        const saat = fmGetir(p.sicil_no, g.tarih)
        if (saat > 0) {
          const deger = grid[p.sicil_no]?.[g.tarih] ?? 'X'
          toSave.push({ sicil_no: p.sicil_no, tarih: g.tarih, deger, saat })
        }
      }
    }
    const seciliSiciller = personeller.map(p => p.sicil_no)
    const res = await yevmiyePuantajKaydet(
      donemId,
      mudData?.mudurlukAdi ?? seciliMudurluk,
      seciliStatu,
      seciliSiciller,
      toSave,
    )
    setKaydetYukleniyor(false)
    if (res.hata) setHata(res.hata)
    else setFazlaMesaiLocal({})
  }, [donemId, readonly, seciliMudurluk, seciliStatu, personeller, gunler, grid, fmGetir])

  const tarihFormat = (t: string) => new Date(t).toLocaleDateString('tr-TR')

  const imzaPersonel = (mudurlukPersonelMap ?? {})[seciliMudurluk] ?? []

  useEffect(() => {
    setPuantor('')
    setBirimAmiri('')
    setMudur('')
  }, [seciliMudurluk, seciliStatu])

  async function excelIndir() {
    try {
      const params = new URLSearchParams({
        donem_id: String(donemId),
        mudurluk: seciliMudurluk,
        statu: seciliStatu,
      })
      if (puantor) params.set('puantor', puantor)
      if (birimAmiri) params.set('birim_amiri', birimAmiri)
      if (mudur) params.set('mudur', mudur)
      const url = `/api/kesintiler/yevmiye/excel?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? ''
        const err = ct.includes('json') ? (await res.json().catch(() => ({}))) : {}
        alert(err?.error ?? `Excel indirilemedi (${res.status})`)
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `Yevmiye_Puantaj_${donem.donem_adi ?? 'Donem'}_${seciliMudurluk.replace(/[:\*\?\/\\]/g, ' ')}.xlsx`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('EXCEL_CLIENT_HATASI: ', e)
      alert('Excel indirilemedi.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Link
          href="/kesintiler/yevmiye"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
          </svg>
          Geri
        </Link>
        {showAnaSayfaLink && <DashboardAnaSayfaLink />}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">
          {donem.donem_adi ?? `${donem.baslangic_tarihi?.slice(0, 7) ?? ''} Dönemi`}
        </h1>
        <div className="flex flex-wrap gap-2">
          {seciliStatu === 'İşçi' && (
            <button
              type="button"
              onClick={() => setGunleriIsaretleModu(!gunleriIsaretleModu)}
              disabled={readonly}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                gunleriIsaretleModu
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-50'
              }`}
            >
              Günleri İşaretle
            </button>
          )}
          <button
            type="button"
            onClick={handleKaydet}
            disabled={readonly || kaydetYukleniyor}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {kaydetYukleniyor ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Kaydediliyor…
              </>
            ) : (
              'Kaydet'
            )}
          </button>
          <button
            type="button"
            onClick={excelIndir}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1"
          >
            Excel İndir
          </button>
        </div>
      </div>

      {/* Bilgi */}
      <div className="text-sm text-slate-600 space-y-1">
        <p>
          <span className="font-medium">Dönem:</span> {tarihFormat(donem.baslangic_tarihi)} – {tarihFormat(donem.bitis_tarihi)}
        </p>
        <p className="text-slate-500 text-xs">{PUANTAJ_KOD_ACIKLAMA}</p>
        <p>
          <span className="font-medium">Kayıt:</span> {kayitOzeti}
        </p>
      </div>

      {hata && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {hata}
        </div>
      )}

      {/* Müdürlük - sadece seçili statüde personeli olan müdürlükler */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Müdürlük</label>
        <select
          value={seciliMudurluk}
          onChange={e => setSeciliMudurluk(e.target.value)}
          disabled={mudurlukSaltOkunur}
          title={mudurlukSaltOkunur ? 'Kadronuzda tek görev müdürlüğü tanımlı; değiştirilemez.' : undefined}
          className={`w-full max-w-md px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            mudurlukSaltOkunur ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed' : 'border-slate-300'
          }`}
        >
          {mudurlukSecenekleri.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {mudurlukSaltOkunur && (
          <p className="mt-1 text-xs text-slate-500">Kadro görev müdürlüğünüz tek olduğu için seçim salt okunur.</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {statuSekmeleri.map(s => (
          <button
            key={s.statu}
            type="button"
            onClick={async () => {
              if (gunleriIsaretleModu && s.statu === 'Sözleşmeli') {
                await handleKaydet()
                setGunleriIsaretleModu(false)
              }
              setSeciliStatu(s.statu)
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              seciliStatu === s.statu
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.statu}
          </button>
        ))}
      </div>

      {/* Tablo */}
      {personeller.length === 0 ? (
        <div className="py-12 text-center text-slate-500 rounded-lg border border-slate-200 bg-slate-50">
          {seciliStatu === 'Sözleşmeli'
            ? 'Müdürlükte sözleşmeli personel bulunmamaktadır.'
            : 'Müdürlükte işçi personel bulunmamaktadır.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tek yatay scrollbar: tüm tablo tek overflow-x-auto içinde */}
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="text-xs border-collapse" style={{ minWidth: `${gunler.length * 36 + 420}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-14 border-r border-slate-300">Sıra No</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-16 border-r border-slate-300">Sicil</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 min-w-[140px] border-r border-slate-300">Adı Soyadı</th>
                  {gunler.map(g => (
                    <th key={g.tarih} className="px-0.5 py-1 text-center border-r border-slate-200 w-9">
                      <div className={`font-medium ${g.isHaftaTatil || g.isResmiTatil ? 'text-slate-400' : 'text-slate-600'}`}>{g.gunAdi}</div>
                      <div className="text-[10px] text-slate-500">{g.gun}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10 border-l border-slate-200" title="Normal Çalışma">N.Ç.</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Hafta Tatili">H.T.</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-12" title="Normal Fazla Mesai">FM NOR.</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-12" title="Bayram Fazla Mesai">FM BAY.</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Toplam FM">FM YTOP</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Yıllık İzin">S.İZİN</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Ücretli İzin">Üİ İZİN</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Ücretsiz İzin">Ü.İZİN</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 w-10" title="Rapor">İST.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personeller.map(p => (
                  <YevmiyeSatir
                    key={p.sicil_no}
                    p={p}
                    gunler={gunler}
                    grid={grid}
                    fmGetir={fmGetir}
                    fmGuncelle={fmGuncelle}
                    gunleriIsaretleModu={gunleriIsaretleModu}
                    readonly={readonly}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer: İmzalar */}
      <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Puantör</label>
          <select
            value={puantor}
            onChange={e => setPuantor(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]"
          >
            <option value="">Seçiniz</option>
            {imzaPersonel.map(pr => (
              <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Birim Amiri</label>
          <select
            value={birimAmiri}
            onChange={e => setBirimAmiri(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]"
          >
            <option value="">Seçiniz</option>
            {imzaPersonel.map(pr => (
              <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Müdür</label>
          <select
            value={mudur}
            onChange={e => setMudur(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm min-w-[180px]"
          >
            <option value="">Seçiniz</option>
            {imzaPersonel.map(pr => (
              <option key={pr.sicil_no} value={pr.sicil_no}>{pr.ad_soyad} ({pr.sicil_no})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function YevmiyeSatir({
  p,
  gunler,
  grid,
  fmGetir,
  fmGuncelle,
  gunleriIsaretleModu,
  readonly,
}: {
  p: YevmiyePersonel
  gunler: YevmiyeGun[]
  grid: Record<string, Record<string, string>>
  fmGetir: (sicil: string, tarih: string) => number
  fmGuncelle: (sicil: string, tarih: string, deger: number) => void
  gunleriIsaretleModu: boolean
  readonly: boolean
}) {
  const degerGetir = (tarih: string) => grid[p.sicil_no]?.[tarih] ?? ''
  const fmYtop = gunler.reduce((s, g) => s + fmGetir(p.sicil_no, g.tarih), 0)

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-2 py-1 text-center border-r border-slate-300 tabular-nums text-slate-600">{p.siraNo}</td>
      <td className="px-2 py-1 text-center border-r border-slate-300 text-xs font-medium text-slate-600">{p.sicil_no}</td>
      <td className="px-3 py-1 border-r border-slate-300 font-medium text-slate-800">{p.ad_soyad}</td>
      {gunler.map(g => {
        const deger = degerGetir(g.tarih)
        const fm = fmGetir(p.sicil_no, g.tarih)
        const isYillikIzin = deger === 'S'
        return (
          <td
            key={g.tarih}
            className={`px-0.5 py-1 text-center border-r border-slate-200 align-top ${isYillikIzin ? 'bg-blue-50' : ''}`}
          >
            <div className="text-slate-700 font-medium">{deger || '—'}</div>
            {gunleriIsaretleModu && (deger === 'X' || deger === 'x' || deger === 'HT' || deger === 'B') && (
              <input
                type="number"
                min={0}
                step={0.5}
                value={fm > 0 ? fm : ''}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 0
                  fmGuncelle(p.sicil_no, g.tarih, v)
                }}
                disabled={readonly}
                placeholder="s"
                className="mt-0.5 w-10 text-center text-[10px] border border-slate-200 rounded px-1 py-0.5 text-blue-600"
              />
            )}
            {!gunleriIsaretleModu && fm > 0 && (
              <div className="text-[10px] text-blue-600 mt-0.5">{fm} s</div>
            )}
          </td>
        )
      })}
      <td className="px-2 py-1 text-center border-l border-slate-200 tabular-nums font-medium">{p.gunX}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium">{p.gunHT}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium text-slate-600">{p.fmNor}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium text-slate-600">{p.fmBay}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium text-blue-600">{fmYtop.toFixed(1)}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium">{p.izinS}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium">{p.izinUI}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium">{p.izinU}</td>
      <td className="px-2 py-1 text-center tabular-nums font-medium">{p.izinIst}</td>
    </tr>
  )
}
