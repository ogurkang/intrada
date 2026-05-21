/**
 * Git commit geçmişini TypeScript modülüne yazar (local dev + Vercel build).
 * Supabase / Vercel API kullanmaz — yalnızca yerel git log.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'src', 'data')
const outTs = join(outDir, 'gelistirmeler-data.ts')
const LIMIT = 40

function gitCommits() {
  try {
    const out = execSync(
      `git log -n ${LIMIT} --no-merges --pretty=format:%H%x09%ci%x09%s`,
      { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
    )
    return out
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const tab = line.indexOf('\t')
        const tab2 = line.indexOf('\t', tab + 1)
        const fullHash = line.slice(0, tab)
        const dateIso = line.slice(tab + 1, tab2)
        const subject = line.slice(tab2 + 1).trim()
        return {
          hash: fullHash.slice(0, 7),
          fullHash,
          date: dateIso.slice(0, 10),
          subject,
        }
      })
  } catch (e) {
    console.warn('[gelistirmeler] git log alınamadı:', e instanceof Error ? e.message : e)
    return []
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  commits: gitCommits(),
}

mkdirSync(outDir, { recursive: true })

const tsSource = `/** Otomatik üretilir — scripts/generate-gelistirmeler.mjs (elle düzenlemeyin) */
import type { GelistirmelerData } from '@/lib/gelistirmeler-shared'

export const gelistirmelerData: GelistirmelerData = ${JSON.stringify(payload, null, 2)}
`

writeFileSync(outTs, tsSource, 'utf8')
console.log(`[gelistirmeler] ${payload.commits.length} commit → ${outTs}`)
