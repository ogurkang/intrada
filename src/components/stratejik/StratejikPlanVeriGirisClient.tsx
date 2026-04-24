'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface StratejikVeriRow {
  gosterge_id: number
  mudurluk: string
  gosterge_adi: string
  hedef: number | null
  qDegerler: { q1: number; q2: number; q3: number; q4: number }
  yillikToplam: number
  gerceklesmeOran: number | null
}

interface Props {
  donemId: number
  donemAdi: string
  yil: number
  aktifCeyrek: 1 | 2 | 3 | 4
  tamamlananCeyrek: number
  ceyrekDurumlari: Record<number, 'Açık' | 'Kapalı'>
  mudurlukSecenekleri: string[]
  seciliMudurluk: string
  satirlar: StratejikVeriRow[]
  donemYonetebilir: boolean
  kayitYapabilir: boolean
  onKaydet: (donemId: number, yil: number, ceyrek: number, satirlar: { gosterge_id: number; gerceklesen: number }[]) => Promise<{ hata?: string; kaydedilen?: number }>
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
  const [ceyrek, setCeyrek] = useState<number>(aktifCeyrek)
  const [mudurluk, setMudurluk] = useState<string>(seciliMudurluk)
  const [hata, setHata] = useState<string | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [duzenlemeler, setDuzenlemeler] = useState<Record<number, string>>({})
  const [isPending, startTransition] = useTransition()

  const durum = ceyrekDurumlari[ceyrek] ?? 'Kapalı'
  const ceyrekTamamlandi = ceyrek <= tamamlananCeyrek
  const kayitAcik = ceyrekTamamlandi && durum === 'Açık' && kayitYapabilir

  const gosterilen = useMemo(() => satirlar, [satirlar])

  function gerceklesenDegeri(row: StratejikVeriRow): number {
    const edited = duzenlemeler[row.gosterge_id]
    if (edited == null) {
      if (ceyrek === 1) return row.qDegerler.q1
      if (ceyrek === 2) return row.qDegerler.q2
      if (ceyrek === 3) return row.qDegerler.q3
      return row.qDegerler.q4
    }
    const n = Number(edited.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  function kaydet() {
    setHata(null)
    setMesaj(null)
    const payload = gosterilen.map(r => ({ gosterge_id: r.gosterge_id, gerceklesen: gerceklesenDegeri(r) }))
    startTransition(async () => {
      const res = await onKaydet(donemId, yil, ceyrek, payload)
      if (res.hata) setHata(res.hata)
      else {
        setMesaj(`${res.kaydedilen ?? payload.length} kayıt kaydedildi.`)
        setDuzenlemeler({})
        router.refresh()
      }
    })
  }

  function durumAyarla(yeniDurum: 'Açık' | 'Kapalı') {
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const res = await onDonemDurumAyarla(donemId, yil, ceyrek, yeniDurum)
      if (res.hata) setHata(res.hata)
      else {
        setMesaj(`Q${ceyrek} dönemi ${yeniDurum.toLocaleLowerCase('tr-TR')} yapıldı.`)
        router.refresh()
      }
    })
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

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map(q => (
          <button
            key={q}
            type="button"
            onClick={() => setCeyrek(q)}
            className={`px-3 py-2 rounded-lg text-sm border ${ceyrek === q ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            Q{q}
          </button>
        ))}
        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${durum === 'Açık' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {durum}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={mudurluk}
          onChange={e => {
            const m = e.target.value
            setMudurluk(m)
            router.push(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/veri-giris?mudurluk=${encodeURIComponent(m)}&ceyrek=${ceyrek}`)
          }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          {mudurlukSecenekleri.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {donemYonetebilir && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending || !ceyrekTamamlandi}
              onClick={() => durumAyarla('Açık')}
              className="px-3 py-2 text-xs border border-green-300 text-green-700 rounded-lg disabled:opacity-50"
            >
              Q{ceyrek} Aç
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => durumAyarla('Kapalı')}
              className="px-3 py-2 text-xs border border-red-300 text-red-700 rounded-lg disabled:opacity-50"
            >
              Q{ceyrek} Kapat
            </button>
          </div>
        )}
      </div>

      {!ceyrekTamamlandi && (
        <div className="px-3 py-2 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          Q{ceyrek} henüz tamamlanmadığı için veri girişi yapılamaz.
        </div>
      )}
      {!kayitAcik && ceyrekTamamlandi && (
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
                <th className="px-3 py-2 text-left">Müdürlük</th>
                <th className="px-3 py-2 text-left">Gösterge</th>
                <th className="px-3 py-2 text-right">Yıllık Hedef</th>
                <th className="px-3 py-2 text-right">Q{ceyrek} Giriş</th>
                <th className="px-3 py-2 text-right">Yıllık Toplam</th>
                <th className="px-3 py-2 text-right">Gerçekleşme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gosterilen.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-500">Seçili müdürlük için gösterge bulunamadı.</td></tr>
              ) : gosterilen.map(row => {
                const v = duzenlemeler[row.gosterge_id]
                const mevcut = gerceklesenDegeri(row)
                return (
                  <tr key={row.gosterge_id}>
                    <td className="px-3 py-2 text-slate-700">{row.mudurluk}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.gosterge_adi}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(row.hedef)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={v ?? String(mevcut)}
                        onChange={e => setDuzenlemeler(prev => ({ ...prev, [row.gosterge_id]: e.target.value }))}
                        disabled={!kayitAcik}
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-right disabled:bg-slate-100"
                      />
                    </td>
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
          disabled={isPending || !kayitAcik}
          className="px-4 py-2 text-sm text-white bg-slate-800 rounded-lg disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
