type IntradaLoaderProps = {
  /** Alt metin; boş string ile gizlenir */
  label?: string
  /** Daha küçük yerleşim (satır içi paneller) */
  compact?: boolean
  className?: string
}

/**
 * Hafif yükleme göstergesi: yürüyen figür + dosya dolabında çekmece araması.
 * Yalnızca CSS transform animasyonu (GPU dostu, ek kütüphane yok).
 */
export function IntradaLoader({
  label = 'Yükleniyor…',
  compact = false,
  className = '',
}: IntradaLoaderProps) {
  const box = compact ? 96 : 132

  return (
    <div
      className={`intrada-loader flex flex-col items-center gap-3 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || 'Yükleniyor'}
    >
      <svg
        width={box}
        height={Math.round(box * 0.78)}
        viewBox="0 0 160 124"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="intrada-loader-svg text-slate-600"
        aria-hidden
      >
        {/* Zemin gölgesi */}
        <ellipse cx="82" cy="118" rx="52" ry="4" className="fill-slate-200/80" />

        {/* Dosya dolabı gövdesi */}
        <rect x="72" y="28" width="76" height="86" rx="4" className="fill-slate-200 stroke-slate-400" strokeWidth="1.5" />
        <line x1="72" y1="57" x2="148" y2="57" className="stroke-slate-300" strokeWidth="1" />
        <line x1="72" y1="86" x2="148" y2="86" className="stroke-slate-300" strokeWidth="1" />

        {/* Üst çekmece */}
        <g className="intrada-loader-drawer intrada-loader-drawer-1">
          <rect x="76" y="32" width="68" height="22" rx="2" className="fill-slate-300 stroke-slate-500" strokeWidth="1.2" />
          <rect x="108" y="41" width="14" height="3" rx="1.5" className="fill-slate-500" />
        </g>

        {/* Orta çekmece — dosya araması */}
        <g className="intrada-loader-drawer intrada-loader-drawer-2">
          <rect x="76" y="61" width="68" height="22" rx="2" className="fill-slate-300 stroke-slate-500" strokeWidth="1.2" />
          <rect x="108" y="70" width="14" height="3" rx="1.5" className="fill-slate-500" />
          {/* Açık çekmecedeki dosyalar */}
          <g className="intrada-loader-files">
            <rect x="118" y="63" width="10" height="16" rx="1" className="fill-amber-100 stroke-amber-300" strokeWidth="1" />
            <rect x="128" y="61" width="10" height="18" rx="1" className="fill-sky-100 stroke-sky-300" strokeWidth="1" />
            <rect x="138" y="64" width="10" height="15" rx="1" className="fill-emerald-100 stroke-emerald-300" strokeWidth="1" />
          </g>
        </g>

        {/* Alt çekmece */}
        <g className="intrada-loader-drawer intrada-loader-drawer-3">
          <rect x="76" y="90" width="68" height="20" rx="2" className="fill-slate-300 stroke-slate-500" strokeWidth="1.2" />
          <rect x="108" y="98" width="14" height="3" rx="1.5" className="fill-slate-500" />
        </g>

        {/* Yürüyen personel */}
        <g className="intrada-loader-person">
          <circle cx="34" cy="52" r="7" className="fill-slate-500" />
          <path d="M34 59 L34 78" className="stroke-slate-600" strokeWidth="2.5" strokeLinecap="round" />
          <g className="intrada-loader-arm" style={{ transformOrigin: '34px 62px' }}>
            <path d="M34 62 L48 68" className="stroke-slate-600" strokeWidth="2.2" strokeLinecap="round" />
          </g>
          <path d="M34 78 L28 96" className="intrada-loader-leg intrada-loader-leg-a stroke-slate-600" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M34 78 L40 96" className="intrada-loader-leg intrada-loader-leg-b stroke-slate-600" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* Arama vurgusu */}
        <circle cx="132" cy="70" r="9" className="intrada-loader-search fill-none stroke-sky-500" strokeWidth="1.6" />
        <line x1="138" y1="76" x2="143" y2="81" className="intrada-loader-search stroke-sky-500" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      {label ? (
        <p className={`text-slate-500 font-medium tracking-wide ${compact ? 'text-xs' : 'text-sm'}`}>
          {label.replace(/…$|\.{3}$/, '')}
          <span className="intrada-loader-dots inline-block w-[1.1em] text-left" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      ) : null}
    </div>
  )
}
