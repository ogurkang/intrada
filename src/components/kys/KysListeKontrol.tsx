'use client'

import { useMemo, useState } from 'react'

export const KYS_SATIR_SECENEKLERI = [25, 50, 75, 100] as const
export type KysSatirSayisi = (typeof KYS_SATIR_SECENEKLERI)[number]

export type KysListeSortYon = 'asc' | 'desc'

export function useKysListeSayfalama<T>(items: T[], varsayilan: KysSatirSayisi = 25) {
  const [sayfaBoyutu, setSayfaBoyutuState] = useState<KysSatirSayisi>(varsayilan)
  const [sayfa, setSayfa] = useState(1)

  const toplam = items.length
  const toplamSayfa = Math.max(1, Math.ceil(toplam / sayfaBoyutu) || 1)
  const aktifSayfa = Math.min(sayfa, toplamSayfa)

  const sayfali = useMemo(() => {
    const start = (aktifSayfa - 1) * sayfaBoyutu
    return items.slice(start, start + sayfaBoyutu)
  }, [items, aktifSayfa, sayfaBoyutu])

  function setSayfaBoyutu(n: KysSatirSayisi) {
    setSayfaBoyutuState(n)
    setSayfa(1)
  }

  return {
    sayfaBoyutu,
    setSayfaBoyutu,
    sayfa: aktifSayfa,
    setSayfa,
    toplamSayfa,
    toplam,
    sayfali,
    baslangicSira: (aktifSayfa - 1) * sayfaBoyutu,
  }
}

export function kysListeSirala<T>(
  items: T[],
  key: string | null,
  yon: KysListeSortYon,
  getter: (item: T, key: string) => string | number | null | undefined,
): T[] {
  if (!key) return items
  const mul = yon === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const av = getter(a, key)
    const bv = getter(b, key)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
    return String(av).localeCompare(String(bv), 'tr', { numeric: true, sensitivity: 'base' }) * mul
  })
}

interface AracCubuguProps {
  toplam: number
  sayfa: number
  toplamSayfa: number
  sayfaBoyutu: KysSatirSayisi
  onSayfaBoyutu: (n: KysSatirSayisi) => void
  onSayfa: (n: number | ((p: number) => number)) => void
  etiket?: string
}

export function KysListeAracCubugu({
  toplam,
  sayfa,
  toplamSayfa,
  sayfaBoyutu,
  onSayfaBoyutu,
  onSayfa,
  etiket = 'kayıt',
}: AracCubuguProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-slate-600">
        <span>
          Toplam <strong className="font-semibold text-slate-800">{toplam}</strong> {etiket}
        </span>
        <span className="text-slate-300">·</span>
        <label className="flex items-center gap-1.5">
          <span className="text-slate-500">Satır</span>
          <select
            value={sayfaBoyutu}
            onChange={e => onSayfaBoyutu(Number(e.target.value) as KysSatirSayisi)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {KYS_SATIR_SECENEKLERI.map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">
          Sayfa {sayfa} / {toplamSayfa}
        </span>
        <button
          type="button"
          onClick={() => onSayfa(p => Math.max(1, p - 1))}
          disabled={sayfa <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
        >
          Önceki
        </button>
        <button
          type="button"
          onClick={() => onSayfa(p => Math.min(toplamSayfa, p + 1))}
          disabled={sayfa >= toplamSayfa}
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
        >
          Sonraki
        </button>
      </div>
    </div>
  )
}

interface SortThProps {
  label: string
  sortKey: string
  aktifKey: string | null
  yon: KysListeSortYon
  onSort: (key: string) => void
  className?: string
  align?: 'left' | 'center'
}

export function KysSortTh({
  label,
  sortKey,
  aktifKey,
  yon,
  onSort,
  className = '',
  align = 'left',
}: SortThProps) {
  const aktif = aktifKey === sortKey
  return (
    <th className={`px-3 py-3 font-semibold text-slate-700 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span className={`text-[10px] ${aktif ? 'text-teal-700' : 'text-slate-300'}`}>
          {aktif ? (yon === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}
