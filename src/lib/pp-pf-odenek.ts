/**
 * Gösterge bazlı ödenek satırlarını faaliyet id’lerine toplar.
 * Rapor / liste kodları faaliyet düzeyinde aggregate etmeye devam eder.
 */

export type PpPfOdenekSatir = {
  pf_faaliyet_id: number
  pf_gosterge_id: number
  butce_kodu_id?: number
  t1_butce: number | null
  t1_haziran: number | null
  t1_yil_sonu: number | null
  t_butce: number | null
  t1_tahmin: number | null
  t2_tahmin: number | null
}

type Sb = {
  from: (t: string) => {
    select: (cols: string) => {
      in: (col: string, ids: number[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
    }
  }
}

export async function ppPfOdenekSatirlariYukle(
  sb: Sb,
  pfFaaliyetIds: number[],
  sutunlar: string = 't1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin',
): Promise<{ data: PpPfOdenekSatir[]; error: string | null }> {
  const ids = [...new Set(pfFaaliyetIds.filter(n => Number.isFinite(n) && n > 0))]
  if (!ids.length) return { data: [], error: null }

  const { data: gRaw, error: gErr } = await sb
    .from('performans_programi_pf_gosterge')
    .select('id, faaliyet_id')
    .in('faaliyet_id', ids)
  if (gErr) return { data: [], error: gErr.message }

  const gostergeler = (gRaw ?? []) as { id: number; faaliyet_id: number }[]
  if (!gostergeler.length) return { data: [], error: null }

  const gToF = new Map(gostergeler.map(g => [Number(g.id), Number(g.faaliyet_id)]))
  const gIds = gostergeler.map(g => Number(g.id)).filter(Number.isFinite)

  const { data: oRaw, error: oErr } = await sb
    .from('performans_programi_pf_odenek')
    .select(`pf_gosterge_id, butce_kodu_id, ${sutunlar}`)
    .in('pf_gosterge_id', gIds)
  if (oErr) {
    if (String(oErr.message).includes('pf_gosterge_id')) {
      return { data: [], error: 'Ödenek gösterge bağını için 20261124180000_pp_odenek_gosterge.sql dosyasını çalıştırın.' }
    }
    return { data: [], error: oErr.message }
  }

  const data: PpPfOdenekSatir[] = []
  for (const r of oRaw ?? []) {
    const row = r as {
      pf_gosterge_id?: number
      butce_kodu_id?: number
      t1_butce?: number | null
      t1_haziran?: number | null
      t1_yil_sonu?: number | null
      t_butce?: number | null
      t1_tahmin?: number | null
      t2_tahmin?: number | null
    }
    const gid = Number(row.pf_gosterge_id)
    const fid = gToF.get(gid)
    if (!fid) continue
    data.push({
      pf_faaliyet_id: fid,
      pf_gosterge_id: gid,
      butce_kodu_id: row.butce_kodu_id != null ? Number(row.butce_kodu_id) : undefined,
      t1_butce: row.t1_butce ?? null,
      t1_haziran: row.t1_haziran ?? null,
      t1_yil_sonu: row.t1_yil_sonu ?? null,
      t_butce: row.t_butce ?? null,
      t1_tahmin: row.t1_tahmin ?? null,
      t2_tahmin: row.t2_tahmin ?? null,
    })
  }
  return { data, error: null }
}
