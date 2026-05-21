'use client'

import Link from 'next/link'
import {
  commitTipEtiket,
  parseCommitSubject,
  type GelistirmeKaydi,
} from '@/lib/gelistirmeler-shared'

interface Props {
  kayitlar: GelistirmeKaydi[]
  generatedAt: string
}

function tarihFmt(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function generatedFmt(iso: string) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export default function MihenkTaslariListeClient({ kayitlar, generatedAt }: Props) {
  const guncelleme = generatedFmt(generatedAt)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
          ← Genel Bakış
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Mihenk Taşları</h1>
        <p className="text-sm text-slate-600 mt-1">
          Source kodu ile birlikte yapılan geliştirmeler
        </p>
        {guncelleme && (
          <p className="text-xs text-slate-500 mt-2">
            Liste güncellendi: <span className="font-medium text-slate-700">{guncelleme}</span>
            {' · '}
            Toplam <span className="font-medium text-slate-700">{kayitlar.length}</span> kayıt
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {kayitlar.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-14 px-4">
            Henüz kayıtlı geliştirme yok. Deploy sırasında git geçmişi okunur.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {kayitlar.map((k, i) => {
              const { tip, baslik } = parseCommitSubject(k.subject)
              const etiket = commitTipEtiket(tip)
              return (
                <li key={k.fullHash} className="px-5 py-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-slate-400 tabular-nums w-8 shrink-0 pt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {etiket && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-medium">
                            {etiket}
                          </span>
                        )}
                        <span className="text-sm font-medium text-slate-800">{baslik}</span>
                      </div>
                      {tip && k.subject !== baslik && (
                        <p className="text-xs text-slate-500 font-mono mb-1 break-all">{k.subject}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {tarihFmt(k.date)}
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="font-mono">{k.hash}</span>
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
