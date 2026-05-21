import MihenkTaslariListeClient from '@/components/dashboard/MihenkTaslariListeClient'
import {
  getAllGelistirmeler,
  getGelistirmelerGeneratedAt,
} from '@/lib/gelistirmeler-server'

export const dynamic = 'force-dynamic'

export default function MihenkTaslariPage() {
  return (
    <MihenkTaslariListeClient
      kayitlar={getAllGelistirmeler()}
      generatedAt={getGelistirmelerGeneratedAt()}
    />
  )
}
