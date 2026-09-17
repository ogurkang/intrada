import { yuklePersonelKazancKuralKartlari } from '@/lib/personel-kazanc-kural-yukle'
import PersonelKazancKuralClient from '@/components/tanimlar/PersonelKazancKuralClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function PersonelKazancKuralPage() {
  const kartlar = await yuklePersonelKazancKuralKartlari()
  return <PersonelKazancKuralClient kartlar={kartlar} />
}
