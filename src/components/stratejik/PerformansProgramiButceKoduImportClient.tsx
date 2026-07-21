'use client'

import { useState, useTransition } from 'react'

export default function PerformansProgramiButceKoduImportClient() {
  const [file, setFile] = useState<File | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yukle() {
    if (!file) {
      setHata('Önce bir Excel dosyası seçiniz.')
      setMesaj(null)
      return
    }
    setHata(null)
    setMesaj(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/performans-programi/butce-kodu/import', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(String(data?.error ?? 'İçe aktarma başarısız.'))
        return
      }
      setMesaj(`${Number(data?.kaydedilen ?? 0).toLocaleString('tr-TR')} satır içe aktarıldı.`)
      setFile(null)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <p className="text-sm text-slate-600">
        Excel’de ilk 4 sütun ekonomik kod adımları, 5. sütun hesap adı olacak şekilde dosyayı yükleyin.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:px-3 file:py-2 file:border file:border-slate-300 file:rounded-lg file:bg-white"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={yukle}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-60"
        >
          {isPending ? 'Yükleniyor…' : 'Excel İçe Aktar'}
        </button>
      </div>
      {hata && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hata}</p>}
      {mesaj && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{mesaj}</p>}
    </div>
  )
}
