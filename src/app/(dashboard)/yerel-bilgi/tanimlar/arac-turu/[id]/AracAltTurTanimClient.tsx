'use client'

import YerelBilgiTanimListeClient from '@/components/yerel-bilgi/YerelBilgiTanimListeClient'
import type { YerelBilgiTanimRow } from '@/components/yerel-bilgi/YerelBilgiTanimListeClient'
import {
  aracAltTurGuncelle,
  aracAltTurToggle,
  aracAltTurTopluEkle,
  aracAltTurTopluGuncelle,
} from './actions'

type Props = {
  turId: number
  turAdi: string
  rows: YerelBilgiTanimRow[]
}

export default function AracAltTurTanimClient({ turId, turAdi, rows }: Props) {
  return (
    <YerelBilgiTanimListeClient
      title={`Alt türler — ${turAdi}`}
      description="Bu araç türüne bağlı alt türleri tanımlayın."
      geriHref="/yerel-bilgi/tanimlar/arac-turu"
      geriLabel="← Araç türleri"
      rows={rows}
      topluEkle={satirlar => aracAltTurTopluEkle(turId, satirlar)}
      tekGuncelle={(id, fd) => aracAltTurGuncelle(turId, id, fd)}
      topluGuncelle={g => aracAltTurTopluGuncelle(turId, g)}
      toggleAktif={(id, a) => aracAltTurToggle(turId, id, a)}
    />
  )
}
