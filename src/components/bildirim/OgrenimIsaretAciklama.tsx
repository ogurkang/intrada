'use client'

export type OgrenimIsaretTuru = 'varsayilan' | 'kadrosu_ile_ilgili' | 'teknik_ogrenim'

const ACIKLAMALAR: Record<OgrenimIsaretTuru, string> = {
  varsayilan:
    'Personelin işlemlerde esas alınacak ana öğrenim kaydıdır. Bir personelde yalnızca esas alınmasını istediğiniz öğrenim kaydını işaretleyin.',
  kadrosu_ile_ilgili:
    'Diploma veya bölüm personelin kadro unvanıyla doğrudan ilgiliyse işaretleyin. Kariyer unvanı ve kazanç kurallarında bu bilgi kullanılabilir.',
  teknik_ogrenim:
    'Diploma veya bölüm teknik nitelikteyse işaretleyin. Özellikle Tekniker kadrosunun teknik öğrenime bağlı kazanç kurallarında dikkate alınır.',
}

export default function OgrenimIsaretAciklama({ tur }: { tur: OgrenimIsaretTuru }) {
  const aciklama = ACIKLAMALAR[tur]
  return (
    <span className="group relative inline-flex align-middle">
      <span
        tabIndex={0}
        aria-label={aciklama}
        title={aciklama}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 cursor-help focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {aciklama}
      </span>
    </span>
  )
}
