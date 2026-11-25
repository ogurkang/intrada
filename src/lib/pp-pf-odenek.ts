/**
 * Gösterge bazlı ödenek satırlarını faaliyet id’lerine toplar.
 * Kurum İçi göstergelerin ödenekleri rapor toplamına girmez.
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
): Promise<{ data: PpPfOdenekSatir[]; kurumIciFaaliyetIds: number[]; error: string | null }> {
  const ids = [...new Set(pfFaaliyetIds.filter(n => Number.isFinite(n) && n > 0))]
  if (!ids.length) return { data: [], kurumIciFaaliyetIds: [], error: null }

  const gSorgu = await sb
    .from('performans_programi_pf_gosterge')
    .select('id, faaliyet_id, kurum_ici')
    .in('faaliyet_id', ids)
  let gRaw = gSorgu.data
  let gErr = gSorgu.error
  if (gErr && String(gErr.message).includes('kurum_ici')) {
    const yedek = await sb
      .from('performans_programi_pf_gosterge')
      .select('id, faaliyet_id')
      .in('faaliyet_id', ids)
    gRaw = (yedek.data ?? []).map(g => ({ ...(g as object), kurum_ici: false }))
    gErr = yedek.error
  }
  if (gErr) return { data: [], kurumIciFaaliyetIds: [], error: gErr.message }

  const gostergeler = (gRaw ?? []) as { id: number; faaliyet_id: number; kurum_ici?: boolean }[]
  if (!gostergeler.length) return { data: [], kurumIciFaaliyetIds: [], error: null }

  const gToF = new Map(gostergeler.map(g => [Number(g.id), Number(g.faaliyet_id)]))
  const gKurumIci = new Map(gostergeler.map(g => [Number(g.id), Boolean(g.kurum_ici)]))
  const gIds = gostergeler.map(g => Number(g.id)).filter(Number.isFinite)

  const byFaaliyet = new Map<number, { toplam: number; kurumIci: number }>()
  for (const g of gostergeler) {
    const fid = Number(g.faaliyet_id)
    const once = byFaaliyet.get(fid) ?? { toplam: 0, kurumIci: 0 }
    once.toplam += 1
    if (g.kurum_ici) once.kurumIci += 1
    byFaaliyet.set(fid, once)
  }
  const kurumIciFaaliyetIds = [...byFaaliyet.entries()]
    .filter(([, v]) => v.toplam > 0 && v.kurumIci === v.toplam)
    .map(([fid]) => fid)

  const { data: oRaw, error: oErr } = await sb
    .from('performans_programi_pf_odenek')
    .select(`pf_gosterge_id, butce_kodu_id, ${sutunlar}`)
    .in('pf_gosterge_id', gIds)
  if (oErr) {
    if (String(oErr.message).includes('pf_gosterge_id')) {
      return {
        data: [],
        kurumIciFaaliyetIds,
        error: 'Ödenek gösterge bağını için 20261124180000_pp_odenek_gosterge.sql dosyasını çalıştırın.',
      }
    }
    return { data: [], kurumIciFaaliyetIds, error: oErr.message }
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
    // Kurum İçi göstergenin ödeneği maliyet / toplam satırlarına girmez.
    if (gKurumIci.get(gid)) continue
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
  return { data, kurumIciFaaliyetIds, error: null }
}
