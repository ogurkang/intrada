'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface StratejikVeriRow {
  gosterge_id: number
  gosterge_adi: string
  hedef: number | null
  qDegerler: { q1: number; q2: number; q3: number; q4: number }
  qAciklamalar: { q1: string; q2: string; q3: string; q4: string }
  yillikToplam: number
  gerceklesmeOran: number | null
}

interface Props {
  donemId: number
  donemAdi: string
  yil: number
  aktifCeyrek: 1 | 2 | 3 | 4
  aktifTab: 1 | 2 | 3 | 4 | 5
  tamamlananCeyrek: number
  ceyrekDurumlari: Record<number, 'Açık' | 'Kapalı'>
  mudurlukSecenekleri: string[]
  seciliMudurluk: string
  satirlar: StratejikVeriRow[]
  donemYonetebilir: boolean
  kayitYapabilir: boolean
  onKaydet: (donemId: number, yil: number, ceyrek: number, satirlar: { gosterge_id: number; gerceklesen: number; durum_aciklama?: string }[]) => Promise<{ hata?: string; kaydedilen?: number }>
  onDonemDurumAyarla: (donemId: number, yil: number, ceyrek: number, durum: 'Açık' | 'Kapalı') => Promise<{ hata?: string }>
}

function fmt(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '-'
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function StratejikPlanVeriGirisClient({
  donemId,
  donemAdi,
  yil,
  aktifCeyrek,
  aktifTab,
  tamamlananCeyrek,
  ceyrekDurumlari,
  mudurlukSecenekleri,
  seciliMudurluk,
  satirlar,
  donemYonetebilir,
  kayitYapabilir,
  onKaydet,
  onDonemDurumAyarla,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<1 | 2 | 3 | 4 | 5>(aktifTab)
  const [seciliCeyrek, setSeciliCeyrek] = useState<number>(aktifCeyrek)
  const [mudurluk, setMudurluk] = useState<string>(seciliMudurluk)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [duzenlemeler, setDuzenlemeler] = useState<Record<number, string>>({})
  const [durumAciklamalari, setDurumAciklamalari] = useState<Record<number, string>>({})
  const [isPending, startTransition] = useTransition()

  const aktifCeyrekTab = tab === 5 ? seciliCeyrek : tab
  const yillikSekme = tab === 5
  const durum = ceyrekDurumlari[aktifCeyrekTab] ?? 'Kapalı'
  const ceyrekTamamlandi = aktifCeyrekTab <= tamamlananCeyrek
  const kayitAcik = !yillikSekme && ceyrekTamamlandi && durum === 'Açık' && kayitYapabilir

  const gosterilen = useMemo(() => satirlar, [satirlar])

  function gerceklesenDegeri(row: StratejikVeriRow): number {
    const edited = duzenlemeler[row.gosterge_id]
    if (edited == null) {
    if (aktifCeyrekTab === 1) return row.qDegerler.q1
    if (aktifCeyrekTab === 2) return row.qDegerler.q2
    if (aktifCeyrekTab === 3) return row.qDegerler.q3
      return row.qDegerler.q4
    }
    const n = Number(edited.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  function aciklamaDegeri(row: StratejikVeriRow): string {
    const edited = durumAciklamalari[row.gosterge_id]
    if (edited != null) return edited
    if (aktifCeyrekTab === 1) return row.qAciklamalar.q1
    if (aktifCeyrekTab === 2) return row.qAciklamalar.q2
    if (aktifCeyrekTab === 3) return row.qAciklamalar.q3
    return row.qAciklamalar.q4
  }

  function kaydet() {
    setHata(null)
    setMesaj(null)
    const payload = gosterilen.map(r => ({
      gosterge_id: r.gosterge_id,
      gerceklesen: gerceklesenDegeri(r),
      durum_aciklama: aciklamaDegeri(r),
    }))
    startTransition(async () => {
      const res = await onKaydet(donemId, yil, aktifCeyrekTab, payload)
      if (res.hata) setHata(res.hata)
      else {
        setMesaj(`${res.kaydedilen ?? payload.length} kayıt kaydedildi.`)
        setDuzenlemeler({})
        setDurumAciklamalari({})
        router.refresh()
      }
    })
  }

  function durumAyarla(yeniDurum: 'Açık' | 'Kapalı') {
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const res = await onDonemDurumAyarla(donemId, yil, aktifCeyrekTab, yeniDurum)
      if (res.hata) setHata(res.hata)
      else {
        setMesaj(`Çeyrek ${aktifCeyrekTab} dönemi ${yeniDurum.toLocaleLowerCase('tr-TR')} yapıldı.`)
        router.refresh()
      }
    })
  }

  async function excelIndir() {
    try {
      const params = new URLSearchParams({
        donem_id: String(donemId),
        yil: String(yil),
        mudurluk,
      })
      const res = await fetch(`/api/stratejik-plan/veri-giris/excel?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setHata(err?.error ?? `Excel indirilemedi (${res.status})`)
        return
      }
      const blob = await res.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `Stratejik_Veri_Giris_${yil}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(u)
    } catch {
      setHata('Excel indirilemedi.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stratejik Plan Veri Girişi</h1>
          <p className="text-sm text-slate-500 mt-1">{donemAdi} · {yil}</p>
        </div>
        <button
          onClick={() => router.push('/stratejik-yonetim/stratejik-plan/islemler')}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Geri
        </button>
      </div>

      <div className="flex justify-end">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <select
            value={mudurluk}
            onChange={e => {
              const m = e.target.value
              setMudurluk(m)
              router.push(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/veri-giris?mudurluk=${encodeURIComponent(m)}&ceyrek=${aktifCeyrekTab}&sekme=${tab === 5 ? 'yillik' : tab}`)
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {mudurlukSecenekleri.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {donemYonetebilir && !yillikSekme && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending || !ceyrekTamamlandi}
                onClick={() => durumAyarla(durum === 'Açık' ? 'Kapalı' : 'Açık')}
                className="px-3 py-2 text-xs border border-green-300 text-green-700 rounded-lg disabled:opacity-50"
              >
                {durum === 'Açık' ? 'Veri Girişi Kapat' : 'Veri Girişi Aç'}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={excelIndir}
            className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Excel İndir
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" aria-label="Dönem sekmeleri">
          {[1, 2, 3, 4, 5].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t as 1 | 2 | 3 | 4 | 5)
                const q = t === 5 ? seciliCeyrek : t
                if (t !== 5) setSeciliCeyrek(t)
                router.push(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/veri-giris?mudurluk=${encodeURIComponent(mudurluk)}&ceyrek=${q}&sekme=${t === 5 ? 'yillik' : t}`)
              }}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t ? 'border-teal-600 text-teal-800 bg-teal-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t === 5 ? 'YILLIK' : `Çeyrek ${t}`}
            </button>
          ))}
        </nav>
      </div>

      {!yillikSekme && !ceyrekTamamlandi && (
        <div className="px-3 py-2 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          Çeyrek {aktifCeyrekTab} henüz tamamlanmadığı için veri girişi yapılamaz.
        </div>
      )}
      {!yillikSekme && !kayitAcik && ceyrekTamamlandi && (
        <div className="px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
          Bu çeyrek şu an kapalı veya bu müdürlük için kayıt yetkiniz yok.
        </div>
      )}
      {hata && <div className="px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{hata}</div>}
      {mesaj && <div className="px-3 py-2 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">{mesaj}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-center w-20">Sıra No</th>
                <th className="px-3 py-2 text-left">Gösterge</th>
                <th className="px-3 py-2 text-right">Yıllık Hedef</th>
                {!yillikSekme ? <th className="px-3 py-2 text-right">Çeyrek {aktifCeyrekTab} Giriş</th> : null}
                {!yillikSekme ? <th className="px-3 py-2 text-left min-w-[14rem]">Durum Açıklama</th> : null}
                <th className="px-3 py-2 text-right">Yıllık Toplam</th>
                <th className="px-3 py-2 text-right">Gerçekleşme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gosterilen.length === 0 ? (
                <tr><td colSpan={!yillikSekme ? 7 : 5} className="px-3 py-10 text-center text-slate-500">Seçili müdürlük için gösterge bulunamadı.</td></tr>
              ) : gosterilen.map((row, i) => {
                const v = duzenlemeler[row.gosterge_id]
                const mevcut = gerceklesenDegeri(row)
                const aciklama = aciklamaDegeri(row)
                return (
                  <tr key={row.gosterge_id}>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.gosterge_adi}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(row.hedef)}</td>
                    {!yillikSekme ? (
                      <td className="px-3 py-2 text-right">
                        <input
                          value={v ?? String(mevcut)}
                          onChange={e => setDuzenlemeler(prev => ({ ...prev, [row.gosterge_id]: e.target.value }))}
                          disabled={!kayitAcik}
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-right disabled:bg-slate-100"
                        />
                      </td>
                    ) : null}
                    {!yillikSekme ? (
                      <td className="px-3 py-2">
                        <input
                          value={aciklama}
                          onChange={e => setDurumAciklamalari(prev => ({ ...prev, [row.gosterge_id]: e.target.value }))}
                          disabled={!kayitAcik}
                          className="w-full px-2 py-1 border border-slate-300 rounded disabled:bg-slate-100"
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(row.yillikToplam)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.gerceklesmeOran == null ? '-' : `%${row.gerceklesmeOran.toFixed(2)}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={kaydet}
          disabled={isPending || !kayitAcik || yillikSekme}
          className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
