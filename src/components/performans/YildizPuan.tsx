'use client'

/** 1–5 yıldız puanlama; tıklanan yıldız değeri seçilir */
export function YildizPuan({
  value,
  onChange,
  disabled,
  size = 'md',
  muted = false,
}: {
  value: number | null
  onChange?: (v: number) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  /** Salt okunur 1. amir puanları için gri dolu yıldız */
  muted?: boolean
}) {
  const cls = size === 'sm' ? 'text-lg' : 'text-2xl'
  const doluRenk = muted ? 'text-slate-400' : 'text-amber-400'
  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Puan">
      {[1, 2, 3, 4, 5].map(n => {
        const on = (value ?? 0) >= n
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            className={`${cls} leading-none transition ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${on ? doluRenk : 'text-slate-300'}`}
            aria-label={`${n} yıldız`}
          >
            ★
          </button>
        )
      })}
      <span className="ml-2 text-xs text-slate-500 tabular-nums w-6">
        {value ?? '—'}
      </span>
    </div>
  )
}
