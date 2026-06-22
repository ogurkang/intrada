'use client'

import { useMemo, useState } from 'react'
import type { SmsGonderInput, SmsGonderActionSonuc } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import SmsMesajGonderKutusu, { type SablonSecenek } from './SmsMesajGonderKutusu'

export interface SmsPersonelSatir {
  sicil_no: string
  ad_soyad: string
  telefon: string
  telefon_gecerli: boolean
  mudurluk: string
  statu: string
  dogum_tarihi: string | null
}

export interface SmsBebekSatir {
  key: string
  sicil_no: string
  ad_soyad: string
  telefon: string
  telefon_gecerli: boolean
  cocuk_adi: string
  cocuk_dogum: string
}

interface Props {
  personeller: SmsPersonelSatir[]
  bebekler: SmsBebekSatir[]
  sablonlar: SablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
  onGonder: (input: SmsGonderInput) => Promise<SmsGonderActionSonuc>
}

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const SEKMELER = [
  { key: 'dogum', label: '🎂 Doğum Günü' },
  { key: 'bebek', label: '👶 Hoş Geldin Bebek' },
  { key: 'tekil', label: '✉️ Tekil Mesajlar' },
] as const

function ayNo(tarih: string | null | undefined): number | null {
  if (!tarih) return null
  const m = String(tarih).slice(5, 7)
  const n = parseInt(m, 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
}

function gunFarki(tarih: string): number {
  const d = new Date(tarih)
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY
  const bugun = new Date()
  return Math.floor((bugun.getTime() - d.getTime()) / 86400000)
}

function benzersizSirali(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
}

export default function SmsIslemleriClient({
  personeller,
  bebekler,
  sablonlar,
  originatorlar,
  gonderimAcik,
  onGonder,
}: Props) {
  const [sekme, setSekme] = useState<(typeof SEKMELER)[number]['key']>('dogum')

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {SEKMELER.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSekme(s.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              sekme === s.key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sekme === 'dogum' && (
        <DogumGunuWidget
          personeller={personeller}
          sablonlar={sablonlar}
          originatorlar={originatorlar}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
        />
      )}
      {sekme === 'bebek' && (
        <BebekWidget
          bebekler={bebekler}
          sablonlar={sablonlar}
          originatorlar={originatorlar}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
        />
      )}
      {sekme === 'tekil' && (
        <TekilWidget
          personeller={personeller}
          sablonlar={sablonlar}
          originatorlar={originatorlar}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
        />
      )}
    </div>
  )
}

/* ---------------- Doğum Günü ---------------- */

function DogumGunuWidget({
  personeller,
  sablonlar,
  originatorlar,
  gonderimAcik,
  onGonder,
}: Omit<Props, 'bebekler'>) {
  const [ay, setAy] = useState(new Date().getMonth() + 1)
  const [secili, setSecili] = useState<Set<string>>(new Set())

  const liste = useMemo(
    () => personeller.filter(p => ayNo(p.dogum_tarihi) === ay).sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr')),
    [personeller, ay],
  )
  const secilebilir = useMemo(() => liste.filter(p => p.telefon_gecerli), [liste])
  const tumuSecili = secilebilir.length > 0 && secilebilir.every(p => secili.has(p.sicil_no))
  const gonderilecek = liste.filter(p => p.telefon_gecerli && secili.has(p.sicil_no)).map(p => p.sicil_no)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <label className="text-sm text-slate-600">Doğum ayı:</label>
          <select
            value={ay}
            onChange={e => {
              setAy(Number(e.target.value))
              setSecili(new Set())
            }}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {AYLAR.map((a, i) => (
              <option key={a} value={i + 1}>
                {a}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{liste.length} kişi</span>
        </div>
        <SecimListesi
          satirlar={liste.map(p => ({
            key: p.sicil_no,
            ad: p.ad_soyad,
            altMetin: [p.sicil_no, p.dogum_tarihi ?? ''].filter(Boolean).join(' · '),
            telefon: p.telefon,
            telefonGecerli: p.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          tumuSecili={tumuSecili}
          secilebilirKeyler={secilebilir.map(p => p.sicil_no)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 self-start">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Doğum günü mesajı</h3>
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['dogum_gunu', 'genel']}
          originatorlar={originatorlar}
          baglam="dogum_gunu"
          sicilNolar={gonderilecek}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
          onBasarili={() => setSecili(new Set())}
        />
      </div>
    </div>
  )
}

/* ---------------- Hoş Geldin Bebek ---------------- */

function BebekWidget({
  bebekler,
  sablonlar,
  originatorlar,
  gonderimAcik,
  onGonder,
}: Omit<Props, 'personeller'>) {
  const [mod, setMod] = useState<'ay' | 'gun'>('ay')
  const [ay, setAy] = useState(new Date().getMonth() + 1)
  const [gun, setGun] = useState(30)
  const [secili, setSecili] = useState<Set<string>>(new Set())

  const liste = useMemo(() => {
    const f =
      mod === 'ay'
        ? bebekler.filter(b => ayNo(b.cocuk_dogum) === ay)
        : bebekler.filter(b => {
            const d = gunFarki(b.cocuk_dogum)
            return d >= 0 && d <= gun
          })
    return f.sort((a, b) => b.cocuk_dogum.localeCompare(a.cocuk_dogum))
  }, [bebekler, mod, ay, gun])

  const secilebilir = useMemo(() => liste.filter(b => b.telefon_gecerli), [liste])
  const tumuSecili = secilebilir.length > 0 && secilebilir.every(b => secili.has(b.key))

  const seciliRows = liste.filter(b => b.telefon_gecerli && secili.has(b.key))
  const gonderilecekSicil = [...new Set(seciliRows.map(b => b.sicil_no))]
  const cocukAdiBySicil: Record<string, string> = {}
  for (const r of seciliRows) cocukAdiBySicil[r.sicil_no] = r.cocuk_adi

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <select
            value={mod}
            onChange={e => {
              setMod(e.target.value as 'ay' | 'gun')
              setSecili(new Set())
            }}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="ay">Aya göre</option>
            <option value="gun">Son güne göre</option>
          </select>
          {mod === 'ay' ? (
            <select
              value={ay}
              onChange={e => {
                setAy(Number(e.target.value))
                setSecili(new Set())
              }}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {AYLAR.map((a, i) => (
                <option key={a} value={i + 1}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              Son
              <input
                type="number"
                min={1}
                max={365}
                value={gun}
                onChange={e => {
                  setGun(Math.max(1, Number(e.target.value) || 1))
                  setSecili(new Set())
                }}
                className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-sm"
              />
              gün
            </div>
          )}
          <span className="text-xs text-slate-400 ml-auto">{liste.length} kayıt</span>
        </div>
        <SecimListesi
          satirlar={liste.map(b => ({
            key: b.key,
            ad: b.ad_soyad,
            altMetin: `Bebek: ${b.cocuk_adi || '—'} · ${b.cocuk_dogum}`,
            telefon: b.telefon,
            telefonGecerli: b.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          tumuSecili={tumuSecili}
          secilebilirKeyler={secilebilir.map(b => b.key)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 self-start">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Hoş geldin bebek mesajı</h3>
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['hosgeldin_bebek', 'genel']}
          originatorlar={originatorlar}
          baglam="hosgeldin_bebek"
          sicilNolar={gonderilecekSicil}
          cocukAdiBySicil={cocukAdiBySicil}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
          onBasarili={() => setSecili(new Set())}
        />
      </div>
    </div>
  )
}

/* ---------------- Tekil ---------------- */

function TekilWidget({
  personeller,
  sablonlar,
  originatorlar,
  gonderimAcik,
  onGonder,
}: Omit<Props, 'bebekler'>) {
  const [arama, setArama] = useState('')
  const [mudurluk, setMudurluk] = useState('')
  const [statu, setStatu] = useState('')
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [manuel, setManuel] = useState('')

  const mudurlukler = useMemo(() => benzersizSirali(personeller.map(p => p.mudurluk)), [personeller])
  const statuler = useMemo(() => benzersizSirali(personeller.map(p => p.statu)), [personeller])

  const liste = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    return personeller.filter(p => {
      if (mudurluk && p.mudurluk !== mudurluk) return false
      if (statu && p.statu !== statu) return false
      if (q && !p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) && !p.sicil_no.includes(q)) return false
      return true
    })
  }, [personeller, arama, mudurluk, statu])

  const secilebilir = useMemo(() => liste.filter(p => p.telefon_gecerli), [liste])
  const tumuSecili = secilebilir.length > 0 && secilebilir.every(p => secili.has(p.sicil_no))
  const gonderilecek = liste.filter(p => p.telefon_gecerli && secili.has(p.sicil_no)).map(p => p.sicil_no)
  const manuelAdet = manuel.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Ad veya sicil ara…"
            className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={mudurluk}
            onChange={e => setMudurluk(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[170px]"
          >
            <option value="">Tüm müdürlükler</option>
            {mudurlukler.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={statu}
            onChange={e => setStatu(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[150px]"
          >
            <option value="">Tüm statüler</option>
            {statuler.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <SecimListesi
          satirlar={liste.map(p => ({
            key: p.sicil_no,
            ad: p.ad_soyad,
            altMetin: [p.sicil_no, p.mudurluk, p.statu].filter(Boolean).join(' · '),
            telefon: p.telefon,
            telefonGecerli: p.telefon_gecerli,
          }))}
          secili={secili}
          setSecili={setSecili}
          tumuSecili={tumuSecili}
          secilebilirKeyler={secilebilir.map(p => p.sicil_no)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 self-start space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ek numaralar (manuel)</label>
          <textarea
            value={manuel}
            onChange={e => setManuel(e.target.value)}
            rows={2}
            placeholder="Virgül/boşluk/satırla ayırın"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
          />
        </div>
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['dogum_gunu', 'hosgeldin_bebek', 'evlilik', 'genel']}
          originatorlar={originatorlar}
          baglam="tekil"
          sicilNolar={gonderilecek}
          manuelNumaralar={manuel}
          manuelAdet={manuelAdet}
          gonderimAcik={gonderimAcik}
          onGonder={onGonder}
          onBasarili={() => {
            setSecili(new Set())
            setManuel('')
          }}
        />
      </div>
    </div>
  )
}

/* ---------------- Ortak seçim listesi ---------------- */

interface SecimSatir {
  key: string
  ad: string
  altMetin: string
  telefon: string
  telefonGecerli: boolean
}

function SecimListesi({
  satirlar,
  secili,
  setSecili,
  tumuSecili,
  secilebilirKeyler,
}: {
  satirlar: SecimSatir[]
  secili: Set<string>
  setSecili: React.Dispatch<React.SetStateAction<Set<string>>>
  tumuSecili: boolean
  secilebilirKeyler: string[]
}) {
  function toggle(key: string) {
    setSecili(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }
  function tumunuToggle() {
    setSecili(prev => {
      const n = new Set(prev)
      if (tumuSecili) secilebilirKeyler.forEach(k => n.delete(k))
      else secilebilirKeyler.forEach(k => n.add(k))
      return n
    })
  }
  const seciliSayi = satirlar.filter(s => secili.has(s.key)).length

  return (
    <>
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={tumuSecili} onChange={tumunuToggle} disabled={!secilebilirKeyler.length} />
          Görünen geçerli numaraları seç ({secilebilirKeyler.length})
        </label>
        <span>{seciliSayi} seçili</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {satirlar.map(s => (
              <tr key={s.key} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="pl-4 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={secili.has(s.key)}
                    disabled={!s.telefonGecerli}
                    onChange={() => toggle(s.key)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <div className="font-medium text-slate-800">{s.ad}</div>
                  <div className="text-xs text-slate-400">{s.altMetin}</div>
                </td>
                <td className="py-2 pr-4 text-right whitespace-nowrap">
                  {s.telefonGecerli ? (
                    <span className="text-slate-600">{s.telefon}</span>
                  ) : (
                    <span className="text-xs text-red-500">telefon yok</span>
                  )}
                </td>
              </tr>
            ))}
            {!satirlar.length && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
