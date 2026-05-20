/**
 * Müdürlük konumu artık tanim_mudurluk_yerleske.konum üzerinden okunur.
 */

export interface MudurlukKonumTanimRow {
  mudurluk_adi: string
  konum: string
  sira_no?: number | null
}

function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function konumEtiket(konumRaw: string | null | undefined): 'İç' | 'Dış' | null {
  const t = String(konumRaw ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
  if (t === 'iç') return 'İç'
  if (t === 'dış') return 'Dış'
  return null
}

/** Yerleşke eşlemelerinden müdürlük → tek konum (yalnızca tek tip varsa) */
export function mudurlukKonumHaritasi(
  tanimlar: MudurlukKonumTanimRow[],
): Map<string, 'İç' | 'Dış'> {
  const byMud = new Map<string, Set<'İç' | 'Dış'>>()
  for (const r of tanimlar) {
    const kn = konumEtiket(r.konum)
    if (!kn) continue
    const key = normMudStr(r.mudurluk_adi)
    if (!byMud.has(key)) byMud.set(key, new Set())
    byMud.get(key)!.add(kn)
  }
  const m = new Map<string, 'İç' | 'Dış'>()
  for (const [key, set] of byMud) {
    if (set.size === 1) m.set(key, [...set][0])
  }
  return m
}

/** Yerleşke eşlemelerinden müdürlük → konum metni (birden fazlaysa virgülle) */
export function mudurlukKonumMetniHaritasi(
  tanimlar: Pick<MudurlukKonumTanimRow, 'mudurluk_adi' | 'konum'>[],
): Map<string, string> {
  const byMud = new Map<string, Set<string>>()
  for (const r of tanimlar) {
    const k = String(r.konum ?? '').trim()
    if (!k) continue
    const key = normMudStr(r.mudurluk_adi)
    if (!byMud.has(key)) byMud.set(key, new Set())
    byMud.get(key)!.add(k)
  }
  const m = new Map<string, string>()
  for (const [key, set] of byMud) {
    const sorted = [...set].sort((a, b) => a.localeCompare(b, 'tr'))
    m.set(key, sorted.join(', '))
  }
  return m
}

/** Aktif müdürlüklerin yerleşke bazlı konum tanımları */
export async function fetchMudurlukYerleskeKonumTanimlari(
  supabase: unknown,
): Promise<MudurlukKonumTanimRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tanim_mudurluk_yerleske')
    .select('konum, tanim_mudurluk!inner(mudurluk_adi, sira_no, aktif)')
    .eq('tanim_mudurluk.aktif', true)

  if (error) throw new Error(error.message)

  const rows: MudurlukKonumTanimRow[] = []
  for (const raw of data ?? []) {
    const row = raw as {
      konum: string
      tanim_mudurluk: { mudurluk_adi: string; sira_no: number | null } | null
    }
    if (!row.tanim_mudurluk?.mudurluk_adi) continue
    rows.push({
      mudurluk_adi: row.tanim_mudurluk.mudurluk_adi,
      konum: row.konum,
      sira_no: row.tanim_mudurluk.sira_no,
    })
  }
  return rows
}
