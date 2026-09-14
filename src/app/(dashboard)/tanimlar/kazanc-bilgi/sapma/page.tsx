import { yukleKazancSapmaSonuc } from '@/lib/kazanc-sapma-yukle'
import KazancSapmaClient from '@/components/tanimlar/KazancSapmaClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function KazancSapmaPage() {
  const { sapanlar, tanimsizlar, kontrolEdilen, toplamPersonel } = await yukleKazancSapmaSonuc()

  return (
    <KazancSapmaClient
      mod="sapma"
      sapanlar={sapanlar}
      tanimsizlar={tanimsizlar}
      kontrolEdilen={kontrolEdilen}
      toplamPersonel={toplamPersonel}
    />
  )
}
