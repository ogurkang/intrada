'use client'

const TUM_BELEDIYE = 'Tüm Belediye'

type Secenek = { id: number; mudurluk_adi: string }

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  mudurlukler: Secenek[]
}

/** Eski çoklu kayıtlar ("A | B") için ilk birimi alır. */
export function birimStringToList(raw: string | null | undefined): string[] {
  if (!raw) return []
  const first = raw
    .split('|')
    .map(v => v.trim())
    .find(Boolean)
  return first ? [first] : []
}

export function birimListToString(list: string[]): string {
  const first = list.map(v => v.trim()).find(Boolean)
  return first ?? ''
}

/** Tek seçimli sorumlu birim dropdown (API uyumu için dizi taşır). */
export default function SorumluBirimCokluSecim({ value, onChange, mudurlukler }: Props) {
  const secili = value[0] ?? ''

  return (
    <select
      value={secili}
      onChange={e => {
        const v = e.target.value.trim()
        onChange(v ? [v] : [])
      }}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      <option value="">Seçiniz</option>
      <option value={TUM_BELEDIYE}>{TUM_BELEDIYE}</option>
      {mudurlukler.map(m => (
        <option key={m.id} value={m.mudurluk_adi}>
          {m.mudurluk_adi}
        </option>
      ))}
    </select>
  )
}
