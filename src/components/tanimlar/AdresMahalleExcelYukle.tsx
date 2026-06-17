'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { AdresExcelIceAktarSonuc } from '@/app/(dashboard)/tanimlar/adres/actions'

type Props = {
  onYukle: (fd: FormData) => Promise<AdresExcelIceAktarSonuc>
}

export default function AdresMahalleExcelYukle({ onYukle }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [uyarilar, setUyarilar] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function kaydet() {
    if (!file) {
      setHata('Önce bir Excel dosyası seçin.')
      setBasari(null)
      return
    }
    setHata(null)
    setBasari(null)
    setUyarilar([])
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      const res = await onYukle(fd)
      if (res.hata) {
        setHata(res.hata)
        setUyarilar(res.uyari ?? [])
        return
      }
      const parcalar = [
        `${res.eklenen ?? 0} mahalle eklendi`,
        res.atlanan ? `${res.atlanan} kayıt atlandı (zaten tanımlı)` : null,
      ].filter(Boolean)
      setBasari(parcalar.join('; ') + '. Her yeni kayıt için geçmiş logu oluşturuldu.')
      setUyarilar(res.uyari ?? [])
      setFile(null)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Excel ile toplu yükleme</h2>
        <p className="text-sm text-slate-500 mt-1">
          Dosyada yalnızca <strong>İl</strong>, <strong>İlçe</strong> ve <strong>Mahalle</strong> sütunları olmalıdır.
          İlk satır başlık olabilir. Yüklenen her yeni mahalle için saat ikonunda audit kaydı oluşur.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/api/tanimlar/adres/excel/sablon"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-3-3m3 3l3-3M4 18h16" />
          </svg>
          Şablon İndir
        </a>
      </div>

      <input
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={e => {
          setFile(e.target.files?.[0] ?? null)
          setHata(null)
          setBasari(null)
        }}
        className="block w-full text-sm text-slate-700 file:mr-3 file:px-3 file:py-2 file:border file:border-slate-300 file:rounded-lg file:bg-white file:text-sm file:font-medium"
      />

      {file ? <p className="text-xs text-slate-500">Seçilen: {file.name}</p> : null}

      <button
        type="button"
        onClick={kaydet}
        disabled={isPending || !file}
        className="inline-flex items-center gap-2 bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50 font-medium transition-colors"
      >
        {isPending ? 'Kaydediliyor…' : 'Excel Kaydet'}
      </button>

      {hata ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p> : null}
      {basari ? <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{basari}</p> : null}
      {uyarilar.length > 0 ? (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
          <p className="font-medium">Uyarılar</p>
          <ul className="list-disc pl-5 text-xs space-y-0.5">
            {uyarilar.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
