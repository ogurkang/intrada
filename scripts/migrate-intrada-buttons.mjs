/**
 * Tek seferlik: eski düğme sınıflarını Intrada standart sınıflarına çevirir.
 * node scripts/migrate-intrada-buttons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

const REPLACEMENTS = [
  // Ekleme (açık mavi)
  [
    /inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600(?: transition-colors(?: disabled:opacity-50(?: disabled:cursor-not-allowed)?)?)?/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /inline-flex items-center rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600(?: transition-colors(?: disabled:opacity-50(?: disabled:cursor-not-allowed)?)?)?/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2\s+rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium/g,
    'intrada-btn intrada-btn-ekle',
  ],
  // Kaydet (lacivert)
  [
    /px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700(?: transition-colors)?(?: disabled:opacity-50)?/g,
    'intrada-btn intrada-btn-kaydet',
  ],
  [
    /rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700(?: disabled:opacity-50)?/g,
    'intrada-btn intrada-btn-kaydet',
  ],
  [
    /px-4 py-2 rounded-lg bg-slate-800 text-white text-sm(?: disabled:opacity-50)?/g,
    'intrada-btn intrada-btn-kaydet',
  ],
  // Excel
  [
    /inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600(?: transition-colors)?(?: disabled:opacity-50 transition-colors gap-2)?/g,
    'intrada-btn intrada-btn-excel',
  ],
  // Üst menü (outline geri linkleri)
  [
    /flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors/g,
    'intrada-btn intrada-btn-ust-menu',
  ],
  [
    /text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2/g,
    'intrada-btn intrada-btn-ust-menu mb-2',
  ],
  [
    /text-sm text-slate-500 hover:text-slate-700/g,
    'intrada-btn intrada-btn-ust-menu',
  ],
  // Ekleme — kalan slate-800 Yeni düğmeleri
  [
    /inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700(?: transition-colors)?(?: font-medium)?/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /flex items-center justify-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium(?: shrink-0)?/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors/g,
    'intrada-btn intrada-btn-kaydet',
  ],
  [
    /px-4 py-2 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50/g,
    'intrada-btn intrada-btn-kaydet disabled:opacity-50',
  ],
  [
    /text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50/g,
    'intrada-btn intrada-btn-kaydet disabled:opacity-50',
  ],
  [
    /w-full py-2\.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700/g,
    'intrada-btn intrada-btn-kaydet w-full py-2.5',
  ],
  // Performans küçük amir düğmeleri
  [
    /inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700/g,
    'intrada-icon-btn intrada-icon-btn-detay h-7 w-7 text-xs font-semibold',
  ],
  [
    /w-full py-2\.5 rounded-lg bg-slate-800 text-white text-sm font-medium(?: hover:bg-slate-700)? disabled:opacity-50/g,
    'intrada-btn intrada-btn-kaydet w-full py-2.5 disabled:opacity-50',
  ],
  [
    /flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700(?: transition-colors)?(?: font-medium)?/g,
    'intrada-btn intrada-btn-ekle',
  ],
  [
    /inline-flex items-center rounded-lg bg-slate-800 text-white px-6 py-2\.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50(?: disabled:pointer-events-none)?/g,
    'intrada-btn intrada-btn-kaydet px-6 py-2.5 disabled:opacity-50',
  ],
  [
    /px-4 py-2 text-sm bg-slate-800 text-white rounded-lg(?: hover:bg-slate-700)?(?: disabled:opacity-50)?/g,
    'intrada-btn intrada-btn-kaydet disabled:opacity-50',
  ],
  [
    /px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700(?: disabled:opacity-50)?/g,
    'intrada-btn intrada-btn-duzenle',
  ],
  [
    /px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50/g,
    'intrada-btn intrada-btn-duzenle',
  ],
  // Detay (lacivert) — tablo ikon linkleri
  [
    /inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors/g,
    'intrada-icon-btn intrada-icon-btn-detay',
  ],
]

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, files)
    else if (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts')) files.push(p)
  }
  return files
}

let changed = 0
for (const file of walk(root)) {
  if (file.includes('intrada-button') || file.includes('IntradaButton') || file.includes('migrate-intrada')) continue
  let src = fs.readFileSync(file, 'utf8')
  const orig = src
  for (const [re, rep] of REPLACEMENTS) {
    src = src.replace(re, rep)
  }
  if (src !== orig) {
    fs.writeFileSync(file, src)
    changed++
    console.log('updated:', path.relative(root, file))
  }
}
console.log(`Done. ${changed} files updated.`)
