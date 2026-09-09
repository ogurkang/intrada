import { yukleKazancSapmaSonuc } from '@/lib/kazanc-sapma-yukle'
import KazancSapmaClient from '@/components/tanimlar/KazancSapmaClient'

export default async function KazancUyusanPage() {
  const { uyusanlar, kontrolEdilen, toplamPersonel } = await yukleKazancSapmaSonuc()

  return (
    <KazancSapmaClient
      mod="uyusan"
      uyusanlar={uyusanlar}
      kontrolEdilen={kontrolEdilen}
      toplamPersonel={toplamPersonel}
    />
  )
}
