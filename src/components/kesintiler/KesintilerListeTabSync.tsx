'use client'

import { useRouter } from 'next/navigation'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'

/** Genel kesintiler sayfasında başka sekmede dönem eklenince sayaçların güncellenmesi */
export default function KesintilerListeTabSync() {
  const router = useRouter()
  useIntradaTabRefresh('kesintiler', router)
  return null
}
