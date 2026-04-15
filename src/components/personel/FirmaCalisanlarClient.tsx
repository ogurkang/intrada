'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'
import { firmaCalisanDetayHref } from '@/lib/firma-calisan-link'
import { isFirmaCalisanAktif } from '@/lib/firma-calisan-durum'

type FC = Tables<'firma_calisanlar'>

interface Props {
  kayitlar:   FC[]
  mudurluler: string[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil:      (id: number) => Promise<{ hata?: string }>
}

function tarihFmt(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

function tarihSiralaDegeri(t: string | null): number {
  if (!t) return Number.NaN
  const ts = Date.parse(t)
  return Number.isFinite(ts) ? ts : Number.NaN
}

const SAYFA_BOYUTU = 10

export default function FirmaCalisanlarClient({ kayitlar, mudurluler, onEkle, onGuncelle, onSil }: Props) {
  const router = useRouter()
  const [arama, setArama]             = useState('')
  const [sekme, setSekme]             = useState<'calisanlar' | 'ayrilanlar'>('calisanlar')
  const [ayrilanSiralama, setAyrilanSiralama] = useState<'asc' | 'desc'>('desc')
  const [mudFiltre, setMud]           = useState('')
  const [formAcik, setFormAcik]       = useState(false)
  const [secili, setSecili]           = useState<FC | null>(null)
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [sayfa, setSayfa]             = useState(0)

  const calisanlarList = useMemo(() =>
    kayitlar.filter(k => isFirmaCalisanAktif(k.ayrilis_tarihi)).sort((a, b) => {
      const na = parseInt(a.sicil_no ?? '0', 10) || 0
      const nb = parseInt(b.sicil_no ?? '0', 10) || 0
      return nb - na
    }),
  [kayitlar])
  const ayrilanlarList = useMemo(() =>
    kayitlar.filter(k => !isFirmaCalisanAktif(k.ayrilis_tarihi)).sort((a, b) => {
      const ta = tarihSiralaDegeri(a.ayrilis_tarihi)
      const tb = tarihSiralaDegeri(b.ayrilis_tarihi)
      const aGecerli = Number.isFinite(ta)
      const bGecerli = Number.isFinite(tb)
      if (aGecerli && bGecerli && ta !== tb) {
        return ayrilanSiralama === 'asc' ? ta - tb : tb - ta
      }
      if (aGecerli !== bGecerli) return aGecerli ? -1 : 1

      const na = parseInt(a.sicil_no ?? '0', 10) || 0
      const nb = parseInt(b.sicil_no ?? '0', 10) || 0
      return nb - na
    }),
  [kayitlar, ayrilanSiralama])

  const liste = sekme === 'calisanlar' ? calisanlarList : ayrilanlarList

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return liste.filter(k => {
      if (mudFiltre && (k.gorev_mudurlugu ?? '') !== mudFiltre) return false
      if (q && !(
        (k.ad_soyad ?? '').toLowerCase().includes(q) ||
        (k.sicil_no ?? '').toLowerCase().includes(q) ||
        (k.tckn ?? '').includes(q)
      )) return false
      return true
    })
  }, [liste, arama, mudFiltre])

  useEffect(() => setSayfa(0), [sekme, arama, mudFiltre])
  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUTU))
  const sayfadaki = filtreli.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU)

  function duzenleAc(k: FC) { setSecili(k); setHata(null); setFormAcik(true) }
  function kapat()       { setFormAcik(false); setSecili(null); setHata(null) }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'refresh') window.location.reload()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => { const r = await onSil(id); if (r.hata) alert(r.hata) })
  }

  const k = secili

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">ADEBEL Personel</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="text-green-600 font-medium">{calisanlarList.length} çalışan</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-500">{ayrilanlarList.length} ayrılan</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Ad, sicil veya TCKN ara…" value={arama} onChange={e => setArama(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-60" />
          </div>
          <Link
            href="/firma-calisanlar/yeni"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Personel
          </Link>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 mb-4">
        {(['calisanlar', 'ayrilanlar'] as const).map(s => (
          <button key={s} onClick={() => setSekme(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              sekme === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {s === 'calisanlar' ? 'Çalışanlar' : 'Ayrılanlar'}
          </button>
        ))}
        {sekme === 'ayrilanlar' && (
          <select
            value={ayrilanSiralama}
            onChange={e => setAyrilanSiralama(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            title="Ayrılanları ayrılış tarihine göre sırala"
          >
            <option value="desc">Ayrılış: Yeni → Eski</option>
            <option value="asc">Ayrılış: Eski → Yeni</option>
          </select>
        )}
        <select value={mudFiltre} onChange={e => setMud(e.target.value)}
          className="ml-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Tüm Müdürlükler</option>
          {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Müdürlük / Görevi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">
                {sekme === 'ayrilanlar' ? 'Ayrılış Tarihi' : 'Giriş Tarihi'}
              </th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sayfadaki.length === 0 && (
              <tr><td colSpan={6} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {sayfadaki.map((k, i) => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => router.push(firmaCalisanDetayHref({ id: k.id, public_id: k.public_id }))}>
                <td className="px-4 py-3 text-center text-xs text-slate-400">{sayfa * SAYFA_BOYUTU + i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.sicil_no ?? '—'}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{k.ad_soyad}</p>
                  {k.tckn && <p className="text-xs text-slate-400 font-mono">{k.tckn}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  <p>{k.gorev_mudurlugu ?? '—'}</p>
                  {k.gorevi && <p className="text-slate-400">{k.gorevi}</p>}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {sekme === 'ayrilanlar' ? tarihFmt(k.ayrilis_tarihi) : tarihFmt(k.kuruma_giris_tarihi)}
                </td>
                <td className="px-4 py-3 text-center">
                  {!isFirmaCalisanAktif(k.ayrilis_tarihi) ? (
                    <span className="inline-flex flex-col items-center gap-0.5">
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">Ayrıldı</span>
                      <span className="text-[10px] text-slate-400">{tarihFmt(k.ayrilis_tarihi)}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-medium">Aktif</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Toplam {filtreli.length} kayıt · Sayfa {sayfa + 1}/{toplamSayfa}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setSayfa(0)} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">İlk</button>
              <button onClick={() => setSayfa(p => Math.max(0, p - 1))} disabled={sayfa === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Önceki</button>
              {Array.from({ length: Math.min(toplamSayfa, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(sayfa - 2, toplamSayfa - 5))
                const p = start + i
                return (
                  <button key={p} onClick={() => setSayfa(p)}
                    className={`w-8 h-7 text-xs rounded border ${p === sayfa ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>
                    {p + 1}
                  </button>
                )
              })}
              {toplamSayfa > 5 && <span className="text-xs text-slate-400">…{toplamSayfa}</span>}
              <button onClick={() => setSayfa(p => Math.min(toplamSayfa - 1, p + 1))} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Sonraki</button>
              <button onClick={() => setSayfa(toplamSayfa - 1)} disabled={sayfa >= toplamSayfa - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">Son</button>
            </div>
          </div>
        )}
      </div>

      {/* Düzenleme Modal */}
      <Modal open={formAcik} onClose={kapat} title="Çalışan Düzenle" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad *</label>
              <input name="ad_soyad" required defaultValue={k?.ad_soyad ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No</label>
              <input name="sicil_no" defaultValue={k?.sicil_no ?? ''} placeholder="Firma içi sicil"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TCKN</label>
              <input name="tckn" defaultValue={k?.tckn ?? ''} maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet" defaultValue={k?.cinsiyet ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="">—</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date" defaultValue={k?.dogum_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim</label>
              <input name="ogrenim" defaultValue={k?.ogrenim ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon" defaultValue={k?.telefon ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <input name="e_posta" type="email" defaultValue={k?.e_posta ?? ''} placeholder="ornek@adapazari.bel.tr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kuruma Giriş Tarihi</label>
              <input name="kuruma_giris_tarihi" type="date" defaultValue={k?.kuruma_giris_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev Müdürlüğü</label>
              <input name="gorev_mudurlugu" list="mud-list" defaultValue={k?.gorev_mudurlugu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              <datalist id="mud-list">
                {mudurluler.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görevi</label>
              <input name="gorevi" defaultValue={k?.gorevi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesleği</label>
              <input name="meslegi" defaultValue={k?.meslegi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Ayrılış (doldurun = ayrıldı)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Tarihi</label>
                <input name="ayrilis_tarihi" type="date" defaultValue={k?.ayrilis_tarihi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Nedeni</label>
                <input name="ayrilis_nedeni" defaultValue={k?.ayrilis_nedeni ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : k ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
