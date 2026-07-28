'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type IsgSaglikTaramasiDetayClient from '@/components/isg/IsgSaglikTaramasiDetayClient'

type Props = ComponentProps<typeof IsgSaglikTaramasiDetayClient>

const IsgSaglikTaramasiDetayClientLazy = dynamic(
  () => import('@/components/isg/IsgSaglikTaramasiDetayClient'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-slate-500 text-sm">Sağlık taraması yükleniyor…</div>
    ),
  },
)

export default function IsgSaglikTaramasiDetayShell(props: Props) {
  return <IsgSaglikTaramasiDetayClientLazy {...props} />
}
