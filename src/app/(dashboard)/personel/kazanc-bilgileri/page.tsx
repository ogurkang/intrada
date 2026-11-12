import { yuklePersonelKazancBilgiKartlari } from '@/lib/personel-kazanc-bilgi-yukle'
import PersonelKazancBilgiClient from '@/components/personel/PersonelKazancBilgiClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function PersonelKazancBilgileriPage() {
  const kartlar = await yuklePersonelKazancBilgiKartlari()
  return <PersonelKazancBilgiClient kartlar={kartlar} />
}
