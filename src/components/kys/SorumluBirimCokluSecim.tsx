'use client'

const TUM_BELEDIYE = 'Tüm Belediye'

type Secenek = { id: number; mudurluk_adi: string }

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  mudurlukler: Secenek[]
}

export function birimStringToList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split('|')
    .map(v => v.trim())
    .filter(Boolean)
}

export function birimListToString(list: string[]): string {
  return Array.from(new Set(list.map(v => v.trim()).filter(Boolean))).join(' | ')
}

export default function SorumluBirimCokluSecim({ value, onChange, mudurlukler }: Props) {
  const secenekler = [TUM_BELEDIYE, ...mudurlukler.map(m => m.mudurluk_adi)]
  const etiket = value.length === 0 ? 'Seçiniz' : value.join(', ')

  function toggle(secenek: string) {
    if (secenek === TUM_BELEDIYE) {
      onChange(value.includes(TUM_BELEDIYE) ? [] : [TUM_BELEDIYE])
      return
    }
    const tumSecili = value.includes(TUM_BELEDIYE)
    const temiz = tumSecili ? [] : value.filter(v => v !== TUM_BELEDIYE)
    if (temiz.includes(secenek)) {
      onChange(temiz.filter(v => v !== secenek))
    } else {
      onChange([...temiz, secenek])
    }
  }

  return (
    <details className="rounded-lg border border-slate-300 bg-white">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-slate-700">
        <span className={value.length ? 'text-slate-800' : 'text-slate-400'}>{etiket}</span>
      </summary>
      <div className="max-h-52 space-y-1 overflow-auto border-t border-slate-200 px-3 py-2">
        {secenekler.map(secenek => (
          <label key={secenek} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.includes(secenek)}
              onChange={() => toggle(secenek)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>{secenek}</span>
          </label>
        ))}
      </div>
    </details>
  )
}
