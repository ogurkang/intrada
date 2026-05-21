import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_CHARS = 14_000

let cache: string | null = null

/** tanitim.md özetini sistem prompt için yükler. */
export function loadTanitimMetni(): string {
  if (cache) return cache
  try {
    const raw = readFileSync(join(process.cwd(), 'tanitim.md'), 'utf8')
    cache = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + '\n\n[… belge kısaltıldı …]' : raw
    return cache
  } catch {
    cache = 'Intrada personel, izin, rapor ve kesinti yönetim uygulamasıdır.'
    return cache
  }
}
