'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type EgitimIstatistikClient from '@/components/egitim/EgitimIstatistikClient'

type Props = ComponentProps<typeof EgitimIstatistikClient>

const EgitimIstatistikClientLazy = dynamic(
  () => import('@/components/egitim/EgitimIstatistikClient'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-slate-500 text-sm">Eğitim istatistiği yükleniyor…</div>
    ),
  },
)

export default function EgitimIstatistikShell(props: Props) {
  return <EgitimIstatistikClientLazy {...props} />
}
