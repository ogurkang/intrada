'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import { TASINIR_GOREVI_OPTIONS } from '@/lib/tasinir-gorevi'
import { tasinirGorevDurumGuncelle, tasinirGorevEkle } from '@/app/(dashboard)/bildirim/tasinir-gorev/actions'
import type { Tables } from '@/types/database'

function tasinirAuditDiff(onceki: unknown, sonraki: unknown) {
  const o = (onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>
  const s = (sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const etiket: Record<string, string> = {
    gorev_adi: 'Görev',
    aktif: 'Aktif',
  }
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    if (String(eski) === String(yeni)) continue
    out.push({ alan, etiket: etiket[alan] ?? alan, onceki: eski, sonraki: yeni })
  }
  return out
}

function tasinirAuditDeger(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'aktif') return deger ? 'Aktif' : 'Pasif'
  return String(deger)
}

export type TasinirGorevListeSatir = {
  id: number
  sicil_no: string
  ad_soyad: string
  gorev_adi: string
  gorev_mudurlugu: string | null
  aktif: boolean
  baslangic_tarihi: string
}

interface Props {
  kayitlar: TasinirGorevListeSatir[]
  personeller: { sicil_no: string; ad_soyad: string }[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

function formatTarih(val: string | null | undefined): string {
  if (!val) return '—'
  const d = val.slice(0, 10)
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  return `${m[3]!.padStart(2, '0')}.${m[2]!.padStart(2, '0')}.${m[1]}`
}

export default function TasinirGorevBildirimClient({
  kayitlar,
  personeller,
  auditLoglarByRefId = {},
}: Props) {
  const router = useRouter()
  useIntradaTabRefresh('ogrenim', router)

  const [arama, setArama] = useState('')
  const [ekleAcik, setEkleAcik] = useState(false)
  const [sicilArama, setSicilArama] = useState('')
  const [secilenSicil, setSecilenSicil] = useState('')
  const [aramaAcik, setAramaAcik] = useState(false)
  const [gorev, setGorev] = useState('')
  const [duzenle, setDuzenle] = useState<TasinirGorevListeSatir | null>(null)
  const [duzenleAktif, setDuzenleAktif] = useState(true)
  const [hata, setHata] = useState<string | null>(null)
  const [uyari, setUyari] = useState<string | null>(null)
  const [tamam, setTamam] = useState<string | null>(null)
  const [bekleyen, setBekleyen] = useState<'ekle' | 'durum' | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'refresh') router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    const list = kayitlar.filter(
      k =>
        !q ||
        k.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        k.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        k.gorev_adi.toLocaleLowerCase('tr-TR').includes(q) ||
        (k.gorev_mudurlugu ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
    return [...list].sort((a, b) => {
      if (a.aktif !== b.aktif) return a.aktif ? -1 : 1
      return a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    })
  }, [kayitlar, arama])

  const filtreliPersonel = personeller
    .filter(
      p =>
        !sicilArama.trim() ||
        p.sicil_no.includes(sicilArama) ||
        p.ad_soyad.toLocaleLowerCase('tr-TR').includes(sicilArama.toLocaleLowerCase('tr-TR')),
    )
    .slice(0, 8)

  const secilen = personeller.find(p => p.sicil_no === secilenSicil)

  function kapatEkle() {
    setEkleAcik(false)
    setSecilenSicil('')
    setSicilArama('')
    setGorev('')
    setHata(null)
  }

  function handleEkle() {
    setHata(null)
    startTransition(async () => {
      const res = await tasinirGorevEkle(secilenSicil, gorev, false)
      if (res.hata) setHata(res.hata)
      else if (res.uyari) {
        setBekleyen('ekle')
        setUyari(res.uyari)
      } else if (res.tamam) {
        kapatEkle()
        setTamam(res.tamam)
        router.refresh()
      }
    })
  }

  function handleDurumKaydet() {
    if (!duzenle) return
    setHata(null)
    startTransition(async () => {
      const res = await tasinirGorevDurumGuncelle(duzenle.id, duzenleAktif, false)
      if (res.hata) setHata(res.hata)
      else if (res.uyari) {
        setBekleyen('durum')
        setUyari(res.uyari)
      } else {
        setDuzenle(null)
        if (res.tamam) setTamam(res.tamam)
        router.refresh()
      }
    })
  }

  function uyariOnayla() {
    const u = uyari
    setUyari(null)
    if (!u) return
    startTransition(async () => {
      if (bekleyen === 'ekle') {
        const res = await tasinirGorevEkle(secilenSicil, gorev, true)
        setBekleyen(null)
        if (res.hata) setHata(res.hata)
        else {
          kapatEkle()
          if (res.tamam) setTamam(res.tamam)
          router.refresh()
        }
      } else if (bekleyen === 'durum' && duzenle) {
        const res = await tasinirGorevDurumGuncelle(duzenle.id, duzenleAktif, true)
        setBekleyen(null)
        if (res.hata) setHata(res.hata)
        else {
          setDuzenle(null)
          if (res.tamam) setTamam(res.tamam)
          router.refresh()
        }
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Taşınır Görev Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Taşınır Kayıt ve Kontrol yetkilileri. Pasif görevliler listede kalır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHata(null)
            setEkleAcik(true)
          }}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Personel Ekle
        </button>
      </div>

      <div className="mb-4">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil, görev veya müdürlük ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">Sıra</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Taşınır Görevi</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Müdürlük</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Durum</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Başlangıç</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-14 text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {filtreli.map((row, idx) => {
              const refId = String(row.id)
              return (
                <tr key={row.id} className={row.aktif ? 'hover:bg-slate-50' : 'bg-slate-50/80 text-slate-500'}>
                  <td className="px-4 py-3 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.ad_soyad}</td>
                  <td className="px-4 py-3">{row.gorev_adi}</td>
                  <td className="px-4 py-3">{row.gorev_mudurlugu || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.aktif ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {row.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{formatTarih(row.baslangic_tarihi)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <SaatGecmisDugmesi
                        sayi={(auditLoglarByRefId[refId] ?? []).length}
                        onClick={() => setGecmisRefId(refId)}
                        title="Değişiklik geçmişi"
                      />
                      <KalemDuzenleDugmesi
                        onClick={() => {
                          setHata(null)
                          setDuzenle(row)
                          setDuzenleAktif(row.aktif)
                        }}
                        title="Düzenle"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={ekleAcik} onClose={kapatEkle} title="Yeni Personel Ekle" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
            {secilen ? (
              <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
                <div>
                  <span className="font-medium text-slate-800">{secilen.ad_soyad}</span>
                  <span className="text-xs text-slate-500 ml-2 font-mono">{secilen.sicil_no}</span>
                </div>
                <button type="button" onClick={() => setSecilenSicil('')} className="text-xs text-slate-600">
                  Değiştir
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  placeholder="İsim veya sicil ara…"
                  value={sicilArama}
                  onChange={e => {
                    setSicilArama(e.target.value)
                    setAramaAcik(true)
                  }}
                  onFocus={() => setAramaAcik(true)}
                  onBlur={() => setTimeout(() => setAramaAcik(false), 200)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                {aramaAcik && filtreliPersonel.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                    {filtreliPersonel.map(p => (
                      <li key={p.sicil_no}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onMouseDown={() => {
                            setSecilenSicil(p.sicil_no)
                            setSicilArama('')
                            setAramaAcik(false)
                          }}
                        >
                          {p.ad_soyad} <span className="text-slate-400 font-mono text-xs ml-1">{p.sicil_no}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Taşınır Görevi</label>
            <select
              value={gorev}
              onChange={e => setGorev(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">Seçiniz</option>
              {TASINIR_GOREVI_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
            <button type="button" onClick={kapatEkle} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">
              İptal
            </button>
            <button
              type="button"
              disabled={isPending || !secilenSicil || !gorev}
              onClick={handleEkle}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!duzenle}
        onClose={() => setDuzenle(null)}
        title="Görev Durumu"
        size="sm"
      >
        {duzenle && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {duzenle.sicil_no} — {duzenle.ad_soyad}
              <span className="block mt-1">{duzenle.gorev_adi}</span>
            </p>
            <label className="block text-sm font-medium text-slate-700">
              Durum
              <select
                value={duzenleAktif ? 'aktif' : 'pasif'}
                onChange={e => setDuzenleAktif(e.target.value === 'aktif')}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
              </select>
            </label>
            {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDuzenle(null)} className="px-4 py-2 text-sm border rounded-lg">
                İptal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDurumKaydet}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!uyari} onClose={() => { setUyari(null); setBekleyen(null) }} title="Uyarı" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{uyari}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setUyari(null)
                setBekleyen(null)
              }}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={uyariOnayla}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg disabled:opacity-50"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!tamam} onClose={() => setTamam(null)} title="Bilgi" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{tamam}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTamam(null)}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Taşınır Görev Geçmişi"
        diffSatirlari={tasinirAuditDiff}
        degerGoster={tasinirAuditDeger}
      />
    </div>
  )
}
