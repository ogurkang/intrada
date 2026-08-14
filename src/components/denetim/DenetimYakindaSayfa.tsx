import Link from 'next/link'
import type { DenetimMenuBolum } from '@/lib/denetim'

interface Props {
  bolum: DenetimMenuBolum
  geriHref?: string
  geriLabel?: string
}

export default function DenetimYakindaSayfa({
  bolum,
  geriHref = '/denetim',
  geriLabel = '← Denetim Yönetimi',
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <Link href={geriHref} className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
          {geriLabel}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{bolum.label}</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">{bolum.aciklama}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-12 text-center text-slate-500 text-sm">
        Bu bölümün içerik ekranı sonraki adımda eklenecek.
      </div>
    </div>
  )
}
