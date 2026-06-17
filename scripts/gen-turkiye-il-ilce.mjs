import fs from 'node:fs'

async function fetchAll(path) {
  const out = []
  let offset = 0
  const limit = 200
  while (true) {
    const url = `https://api.turkiyeapi.dev/v2/${path}?limit=${limit}&offset=${offset}`
    const j = await fetch(url).then(r => r.json())
    out.push(...(j.data || []))
    if (!j.meta || out.length >= j.meta.total) break
    offset += limit
  }
  return out
}

const provs = await fetchAll('provinces')
const dists = await fetchAll('districts')
const iller = provs.map(p => p.name).sort((a, b) => a.localeCompare(b, 'tr'))
const provById = Object.fromEntries(provs.map(p => [p.id, p.name]))
const byIl = {}
for (const d of dists) {
  const il = provById[d.provinceId]
  if (!il) continue
  ;(byIl[il] ||= []).push(d.name)
}
for (const k of Object.keys(byIl)) byIl[k].sort((a, b) => a.localeCompare(b, 'tr'))

const content = `/** Türkiye il / ilçe listesi (TurkiyeAPI). */
export const TURKIYE_ILLER: readonly string[] = ${JSON.stringify(iller, null, 2)}

export const ILCELER_BY_IL: Record<string, readonly string[]> = ${JSON.stringify(byIl, null, 2)}
`

fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync('src/data/turkiye-il-ilce.ts', content)
console.log('OK', iller.length, 'il, Sakarya ilce:', byIl.Sakarya?.length)
