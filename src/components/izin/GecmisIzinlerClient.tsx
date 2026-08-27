'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { gecmisIzinleriSistemeIsle } from '@/app/(dashboard)/izin/actions'

type PreviewRow = {
  siraNo: string
  islemYapan: string
  tarih: string
  sicilNo: string
  adSoyad: string
  vekalet: string
  tur: string
  ayrilis: string
  baslama: string
  gun: string
  durum: string
}

const PREVIEW_LIMIT = 300

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
}

function pick(map: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = map[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function ikiHane(n: number): string {
  return String(n).padStart(2, '0')
}

function formatGgAaYyyy(d: Date): string {
  return `${ikiHane(d.getDate())}/${ikiHane(d.getMonth() + 1)}/${d.getFullYear()}`
}

function excelSeriToDate(n: number): Date | null {
  if (!Number.isFinite(n) || n < 1 || n > 80_000) return null
  const ssf = (XLSX as unknown as { SSF?: { parse_date_code?: (n: number) => { y: number; m: number; d: number } } }).SSF
  const parsed = ssf?.parse_date_code?.(n)
  if (parsed?.y) return new Date(parsed.y, parsed.m - 1, parsed.d)
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86_400_000))
  if (isNaN(d.getTime())) return null
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Metni gün/ay/yıl (gg/aa/yyyy, gg.aa.yyyy, gg-aa-yyyy) olarak okur. */
function parseTarih(s: string): Date | null {
  const t = s.trim()
  if (!t) return null
  const tr = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
  if (tr) {
    const gun = Number(tr[1])
    const ay = Number(tr[2])
    let yil = Number(tr[3])
    if (yil < 100) yil += 2000
    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null
    const d = new Date(yil, ay - 1, gun)
    return isNaN(d.getTime()) ? null : d
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  return null
}

function hucreyiTarihMetni(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date && !isNaN(v.getTime())) return formatGgAaYyyy(v)
  if (typeof v === 'number') {
    const d = excelSeriToDate(v)
    return d ? formatGgAaYyyy(d) : String(v)
  }
  const t = String(v).trim()
  const d = parseTarih(t)
  return d ? formatGgAaYyyy(d) : t
}

/** Ayrılış ve başlama tarihinden takvim günü hesapla (başlama − ayrılış). */
function gunHesapla(ayrilis: string, baslama: string): string {
  const a = parseTarih(ayrilis)
  const b = parseTarih(baslama)
  if (!a || !b) return ''
  const fark = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  return fark > 0 ? String(fark) : ''
}

export default function GecmisIzinlerClient() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [seciliDosya, setSeciliDosya] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [hata, setHata] = useState('')
  const [isleniyor, setIsleniyor] = useState(false)
  const [sonuc, setSonuc] = useState('')

  const sistemeIsle = async () => {
    if (!rows.length || isleniyor) return
    if (!confirm(`${rows.length} kayıt izin hareketlerine yazılacak. 2025/ sıra nolu izinler kesinti menülerine girmez. Devam edilsin mi?`)) return
    setIsleniyor(true)
    setSonuc('')
    try {
      const res = await gecmisIzinleriSistemeIsle(rows)
      if (res.hata) setHata(res.hata)
      else setSonuc(res.mesaj ?? `${res.eklenen ?? 0} kayıt yazıldı.`)
    } catch {
      setHata('Sisteme işleme sırasında bir hata oluştu.')
    } finally {
      setIsleniyor(false)
    }
  }

  const excelOku = async (file: File) => {
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array', cellDates: true })
    const ilkSheet = wb.SheetNames[0]
    if (!ilkSheet) {
      setRows([])
      setHata('Excel içinde okunabilir bir sayfa bulunamadı.')
      return
    }

    const ws = wb.Sheets[ilkSheet]
    const ham = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
      header: 1,
      defval: '',
      raw: true,
    })

    if (!ham.length) {
      setRows([])
      setHata('Excel sayfası boş.')
      return
    }

    const headerRow = ham[0] ?? []
    const headerMap = headerRow.map(normalizeHeader)
    const idxOf = (...alts: string[]) => {
      for (let i = 0; i < headerMap.length; i++) {
        if (alts.includes(headerMap[i])) return i
      }
      return -1
    }

    const iSira = idxOf('sıra no', 'sira no')
    const iIslemYapan = idxOf('işlem yapan', 'islem yapan')
    const iTarih = idxOf('tarih')
    const iSicil = idxOf('sicil no', 'sicil')
    const iAd = idxOf('adı soyadı', 'adi soyadi', 'ad soyad')
    const iVekalet = idxOf('vekalet')
    const iTur = idxOf('tür', 'tur')
    const iAyrilis = idxOf('ayrılış', 'ayrilis')
    const iBaslama = idxOf('başlama', 'baslama')
    const iGun = idxOf('gün', 'gun')
    const iDurum = idxOf('durum')

    const out: PreviewRow[] = ham.slice(1).map(r => {
      const asMap: Record<string, string> = {}
      for (let i = 0; i < headerRow.length; i++) {
        asMap[headerMap[i]] = String(r[i] ?? '').trim()
      }
      return {
        siraNo: iSira >= 0 ? String(r[iSira] ?? '').trim() : pick(asMap, 'sıra no', 'sira no'),
        islemYapan: iIslemYapan >= 0 ? String(r[iIslemYapan] ?? '').trim() : pick(asMap, 'işlem yapan', 'islem yapan'),
        tarih: hucreyiTarihMetni(iTarih >= 0 ? r[iTarih] : pick(asMap, 'tarih')),
        sicilNo: iSicil >= 0 ? String(r[iSicil] ?? '').trim() : pick(asMap, 'sicil no', 'sicil'),
        adSoyad: iAd >= 0 ? String(r[iAd] ?? '').trim() : pick(asMap, 'adı soyadı', 'adi soyadi', 'ad soyad'),
        vekalet: iVekalet >= 0 ? String(r[iVekalet] ?? '').trim() : pick(asMap, 'vekalet'),
        tur: iTur >= 0 ? String(r[iTur] ?? '').trim() : pick(asMap, 'tür', 'tur'),
        ayrilis: hucreyiTarihMetni(iAyrilis >= 0 ? r[iAyrilis] : pick(asMap, 'ayrılış', 'ayrilis')),
        baslama: hucreyiTarihMetni(iBaslama >= 0 ? r[iBaslama] : pick(asMap, 'başlama', 'baslama')),
        gun: (() => {
          const excelGun = iGun >= 0 ? String(r[iGun] ?? '').trim() : pick(asMap, 'gün', 'gun')
          if (excelGun) return excelGun
          const ay = hucreyiTarihMetni(iAyrilis >= 0 ? r[iAyrilis] : pick(asMap, 'ayrılış', 'ayrilis'))
          const bas = hucreyiTarihMetni(iBaslama >= 0 ? r[iBaslama] : pick(asMap, 'başlama', 'baslama'))
          return gunHesapla(ay, bas)
        })(),
        durum: iDurum >= 0 ? String(r[iDurum] ?? '').trim() : pick(asMap, 'durum'),
      }
    })

    const dolu = out.filter(r =>
      [r.siraNo, r.islemYapan, r.tarih, r.sicilNo, r.adSoyad, r.tur, r.ayrilis, r.baslama, r.durum].some(Boolean),
    )
    setRows(dolu)
    setHata('')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Geçmiş İzinler</h1>
        <p className="text-sm text-slate-600 mt-1">
          Excel ile geçmiş izin kayıtlarını yükleyebilir, izin hareketleri düzeninde listeden kontrol edebilirsiniz.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              setSeciliDosya(f?.name ?? '')
              if (!f) {
                setRows([])
                setHata('')
                return
              }
              void excelOku(f).catch(() => {
                setRows([])
                setHata('Excel ön izlemesi okunamadı. Lütfen dosya biçimini kontrol edin.')
              })
            }}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-emerald-700 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-600"
          >
            Excel Yükle
          </button>
          <button
            type="button"
            disabled={rows.length === 0 || isleniyor}
            onClick={() => void sistemeIsle()}
            className="rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isleniyor ? 'İşleniyor…' : 'Sisteme İşle'}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          {seciliDosya ? `Seçilen dosya: ${seciliDosya}` : 'Henüz dosya seçilmedi.'}
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Sisteme İşle, kayıtları izin hareketlerine yazar ve haktan düşen türlerde bakiyeyi günceller. 2025/ sıra nolu izinler kesinti menülerine girmez.
        </p>
        {sonuc ? <p className="text-xs text-emerald-700 mt-1">{sonuc}</p> : null}
        <p className="text-xs text-slate-500 mt-1">
          * Gün: Excel'de sütun yoksa ayrılış – başlama farkından takvim günü olarak hesaplanır.
        </p>
        {hata ? <p className="text-xs text-red-600 mt-1">{hata}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
          Ön izleme: {rows.length} kayıt {rows.length >= PREVIEW_LIMIT ? `(ilk ${PREVIEW_LIMIT})` : ''}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">İşlem Yapan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sicil No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vekalet</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tür</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Ayrılış</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlama</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-14">Gün *</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    Ön izleme için Excel dosyası yükleyin.
                  </td>
                </tr>
              ) : (
                rows.slice(0, PREVIEW_LIMIT).map((h, i) => (
                  <tr key={`${h.sicilNo}-${i}`} className="text-xs">
                    <td className="px-4 py-3 font-mono text-slate-600">{h.siraNo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{h.islemYapan || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{h.tarih || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{h.sicilNo || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{h.adSoyad || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{h.vekalet || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{h.tur || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{h.ayrilis || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{h.baslama || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{h.gun || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{h.durum || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
