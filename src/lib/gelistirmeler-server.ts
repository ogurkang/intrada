import { gelistirmelerData } from '@/data/gelistirmeler-data'

/** Git commit listesi — Supabase/Vercel API yok; build/dev öncesi üretilen TS modülü. */
export function getAllGelistirmeler() {
  return gelistirmelerData.commits ?? []
}

export function getGelistirmelerCount(): number {
  return getAllGelistirmeler().length
}

export function getGelistirmelerGeneratedAt(): string {
  return gelistirmelerData.generatedAt ?? ''
}
