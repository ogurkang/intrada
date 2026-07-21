'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface EgitimKaydi {
  id:               number
  donem_id:         number
  egitim_adi:       string
  kanal:            string | null
  kisa_ad:          string | null
  egitim_baslangic: string | null
  egitim_bitis:     string | null
  sure_dakika:      number
  program:          'Program' | 'Diğer' | 'Evet' | 'Hayır'  // Evet/Hayır eski veri uyumluluğu
  katilimci_sayisi: number
}

export interface PersonelSatir {
  sicil_no:  string
  ad_soyad:  string | null
  mudurluk:  string | null
}

export interface DonemBilgi {
  id:               number
  yil:              number
  donem_adi:        string
  baslangic_tarihi: string
  bitis_tarihi:     string
  durum:            'Açık' | 'Kapalı'
}

interface Props {
  donem:           DonemBilgi
  egitimler:       EgitimKaydi[]
  tumPersonel:     PersonelSatir[]
  katilimMap:      Record<number, string[]>   // egitim_id → sicil_no[]
  onEkle:          (donem_id: number, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle:      (id: number, donem_id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil:           (id: number, donem_id: number) => Promise<{ hata?: string }>
  onKatilimKaydet: (egitim_id: number, donem_id: number, sicilNolar: string[], mudurlukMap: Record<string, string>) => Promise<{ hata?: string }>
}

const KURUMLAR = ['Yüz Yüze', 'Online', 'Hibrit', 'Uzaktan', 'Diğer']
const TURLER = ['Program', 'Diğer']

function sureFmt(dk: number) {
  if (!dk) return '—'
  const s = Math.floor(dk / 60)
  const d = dk % 60
  return s > 0 ? `${s}s ${d > 0 ? d + 'dk' : ''}`.trim() : `${d}dk`
}

// ─── Katılımcı Modal ──────────────────────────────────────────────────────────

function KatilimciModal({
  egitim, tumPersonel, mevcutSiciller, mudurlukMap,
  onKaydet, onKapat,
}: {
  egitim:        EgitimKaydi
  tumPersonel:   PersonelSatir[]
  mevcutSiciller: string[]
  mudurlukMap:   Record<string, string>
  onKaydet:      (siciller: string[]) => Promise<{ hata?: string } | void>
  onKapat:       () => void
}) {
  const [secili, setSecili]           = useState<Set<string>>(new Set(mevcutSiciller))
  const [mudFiltre, setMudFiltre]     = useState('')
  const [arama, setArama]             = useState('')
  const [isPending, startTransition]  = useTransition()
  const [hata, setHata]               = useState<string | null>(null)

  const mudurluler = useMemo(() =>
    [...new Set(tumPersonel.map(p => p.mudurluk ?? 'Belirtilmemiş'))].sort((a, b) => a.localeCompare(b, 'tr'))
  , [tumPersonel])

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    return tumPersonel.filter(p =>
      (!mudFiltre || (p.mudurluk ?? 'Belirtilmemiş') === mudFiltre) &&
      (!q || (p.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) || p.sicil_no.toLocaleLowerCase('tr-TR').includes(q))
    )
  }, [tumPersonel, mudFiltre, arama])

  function toggle(sicil: string) {
    setSecili(prev => {
      const n = new Set(prev)
      if (n.has(sicil)) n.delete(sicil)
      else              n.add(sicil)
      return n
    })
  }

  function tumunuSec() {
    setSecili(prev => {
      const n = new Set(prev)
      filtreli.forEach(p => n.add(p.sicil_no))
      return n
    })
  }

  function tumunuKaldir() {
    setSecili(prev => {
      const n = new Set(prev)
      filtreli.forEach(p => n.delete(p.sicil_no))
      return n
    })
  }

  async function handleKaydet() {
    setHata(null)
    startTransition(async () => {
      const res = await onKaydet(Array.from(secili))
      const resTyped = res as { hata?: string } | void
      if (resTyped && resTyped.hata) setHata(resTyped.hata)
    })
  }

  return (
    <div className="space-y-4">
      <div className="px-3 py-2 bg-indigo-50 rounded-lg text-sm">
        <span className="font-semibold text-indigo-800">{egitim.egitim_adi}</span>
        <span className="text-indigo-500 ml-2">— {secili.size} seçili</span>
      </div>

      <div className="flex gap-2">
        <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ad veya sicil ara…"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <select value={mudFiltre} onChange={e => setMudFiltre(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
          <option value="">Tüm Müdürlükler</option>
          {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={tumunuSec}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
          Tümünü Seç
        </button>
        <button type="button" onClick={tumunuKaldir}
          className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Seçimi Kaldır
        </button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-auto max-h-80">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 w-10 text-left" />
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Ad Soyad</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 min-w-[180px]">Müdürlük</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-xs">Personel bulunamadı.</td></tr>
            )}
            {filtreli.map(p => (
              <tr key={p.sicil_no}
                onClick={() => toggle(p.sicil_no)}
                className={`cursor-pointer transition-colors ${secili.has(p.sicil_no) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                <td className="px-3 py-2 w-10">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    secili.has(p.sicil_no) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                  }`}>
                    {secili.has(p.sicil_no) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">{p.ad_soyad ?? p.sicil_no}</td>
                <td className="px-3 py-2 text-slate-600 text-sm whitespace-nowrap">{p.mudurluk ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onKapat}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</button>
        <button type="button" onClick={handleKaydet} disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {isPending ? 'Kaydediliyor…' : `Kaydet (${secili.size} kişi)`}
        </button>
      </div>
    </div>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function EgitimDetayClient({
  donem, egitimler, tumPersonel, katilimMap,
  onEkle, onGuncelle, onSil, onKatilimKaydet,
}: Props) {
  const [formAcik, setFormAcik]               = useState(false)
  const [katilimAcik, setKatilimAcik]         = useState(false)
  const [seciliEgitim, setSeciliEgitim]       = useState<EgitimKaydi | null>(null)
  const [katilimEgitim, setKatilimEgitim]     = useState<EgitimKaydi | null>(null)
  const [hata, setHata]                       = useState<string | null>(null)
  const [isPending, startTransition]          = useTransition()

  const mudurlukMap = useMemo(() => {
    const m: Record<string, string> = {}
    tumPersonel.forEach(p => { if (p.mudurluk) m[p.sicil_no] = p.mudurluk })
    return m
  }, [tumPersonel])

  function yeniEkleAc()               { setSeciliEgitim(null); setHata(null); setFormAcik(true) }
  function duzenleAc(e: EgitimKaydi)  { setSeciliEgitim(e);   setHata(null); setFormAcik(true) }
  function formKapat()                { setFormAcik(false); setSeciliEgitim(null); setHata(null) }

  function katilimAc(e: EgitimKaydi) { setKatilimEgitim(e); setKatilimAcik(true) }
  function katilimKapat()            { setKatilimAcik(false); setKatilimEgitim(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = seciliEgitim
        ? await onGuncelle(seciliEgitim.id, donem.id, fd)
        : await onEkle(donem.id, fd)
      if (res.hata) setHata(res.hata)
      else formKapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu eğitim silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => { const r = await onSil(id, donem.id); if (r.hata) alert(r.hata) })
  }

  async function handleKatilimKaydet(sicilNolar: string[]) {
    if (!katilimEgitim) return
    startTransition(async () => {
      const res = await onKatilimKaydet(katilimEgitim.id, donem.id, sicilNolar, mudurlukMap)
      if (res.hata) alert(res.hata)
      else katilimKapat()
    })
  }

  const eg = seciliEgitim
  const readonly = donem.durum === 'Kapalı'

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/egitim" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
          ← Dönemler
        </Link>
        <span className="text-slate-300">/</span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{donem.donem_adi}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(donem.baslangic_tarihi).toLocaleDateString('tr-TR')} –{' '}
            {new Date(donem.bitis_tarihi).toLocaleDateString('tr-TR')}
            {' · '}
            <span className={donem.durum === 'Açık' ? 'text-green-600 font-medium' : 'text-slate-500'}>
              {donem.durum}
            </span>
          </p>
        </div>
        <Link href="/egitim/istatistik"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          İstatistik
        </Link>
        <Link
          href={`/api/egitim/${donem.id}/excel`}
          className="intrada-btn intrada-btn-excel"
        >
          Excel İndir
        </Link>
        {!readonly && (
          <button onClick={yeniEkleAc}
            className="intrada-btn intrada-btn-ekle">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Eğitim Ekle
          </button>
        )}
      </div>

      {/* Eğitimler Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-16">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Eğitim Adı</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Kurum</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Tür</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlangıç</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Bitiş</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Süre</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Katılımcı Sayısı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Toplam Süre</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {egitimler.length === 0 && (
              <tr><td colSpan={10} className="text-center py-14 text-slate-400">Bu dönemde eğitim kaydı yok.</td></tr>
            )}
            {egitimler.map((e, idx) => {
              const katilimSayisi = (katilimMap[e.id] ?? []).length
              const toplamSure = e.sure_dakika * katilimSayisi
              return (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center text-xs text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{e.egitim_adi}</p>
                  {e.kisa_ad && <p className="text-xs text-slate-400">{e.kisa_ad}</p>}
                </td>
                <td className="px-4 py-3">
                  {e.kanal ? (
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      e.kanal === 'Online' ? 'bg-blue-50 text-blue-700' :
                      e.kanal === 'Yüz Yüze' ? 'bg-green-50 text-green-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{e.kanal}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    (e.program === 'Program' || e.program === 'Evet') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                  }`}>{e.program === 'Evet' ? 'Program' : e.program === 'Hayır' ? 'Diğer' : e.program}</span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {e.egitim_baslangic ? new Date(e.egitim_baslangic).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {e.egitim_bitis ? new Date(e.egitim_bitis).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">{sureFmt(e.sure_dakika)}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => katilimAc(e)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                      katilimSayisi > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                    }`}>{katilimSayisi}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">
                  {toplamSure > 0 ? `${toplamSure} dk` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {!readonly && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => duzenleAc(e)}
                        className="intrada-btn intrada-btn-duzenle text-xs px-2.5 py-1.5">Düzenle</button>
                      <button onClick={() => handleSil(e.id)} disabled={isPending}
                        className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">Sil</button>
                    </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Eğitim Form Modal */}
      <Modal open={formAcik} onClose={formKapat} title={eg ? 'Eğitim Düzenle' : 'Yeni Eğitim'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Eğitim Adı *</label>
            <input name="egitim_adi" required defaultValue={eg?.egitim_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kısa Ad</label>
              <input name="kisa_ad" defaultValue={eg?.kisa_ad ?? ''} placeholder="Kod/kısa ad"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kurum</label>
              <select name="kanal" defaultValue={eg?.kanal ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="">— Seçiniz —</option>
                {KURUMLAR.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç Tarihi</label>
              <input name="egitim_baslangic" type="date" defaultValue={eg?.egitim_baslangic ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş Tarihi</label>
              <input name="egitim_bitis" type="date" defaultValue={eg?.egitim_bitis ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Süre (dakika)</label>
              <input name="sure_dakika" type="number" defaultValue={eg?.sure_dakika ?? 0} min={0}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tür</label>
              <select name="program" defaultValue={eg?.program === 'Evet' ? 'Program' : eg?.program === 'Hayır' ? 'Diğer' : (eg?.program ?? 'Diğer')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="Program">Program</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={formKapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={isPending}
              className="intrada-btn intrada-btn-kaydet">
              {isPending ? 'Kaydediliyor…' : eg ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Katılımcı Modal */}
      <Modal open={katilimAcik} onClose={katilimKapat} title="Katılımcı Yönetimi" size="xl">
        {katilimEgitim && (
          <KatilimciModal
            egitim={katilimEgitim}
            tumPersonel={tumPersonel}
            mevcutSiciller={katilimMap[katilimEgitim.id] ?? []}
            mudurlukMap={mudurlukMap}
            onKaydet={handleKatilimKaydet}
            onKapat={katilimKapat}
          />
        )}
      </Modal>
    </div>
  )
}
