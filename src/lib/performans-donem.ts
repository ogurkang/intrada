// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

/** Yıl içindeki bir sonraki dönem sıra numarası (örn. 2026/2) */
export async function siradakiPerformansDonemSiraNo(
  supabase: Sb,
  yil: number,
): Promise<string> {
  const { data } = await supabase
    .from('performans_donem')
    .select('sira_no')
    .eq('yil', yil)
    .not('sira_no', 'is', null)
    .order('id', { ascending: false })

  let max = 0
  for (const row of data ?? []) {
    const sn = String(row.sira_no ?? '')
    const m = sn.match(/\/(\d+)\s*$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
    else if (/^\d+$/.test(sn)) max = Math.max(max, parseInt(sn, 10))
  }
  return `${yil}/${max + 1}`
}

/** AYY benzeri: tek açık dönem + önceki dönem kapatildi_at kontrolü */
export async function performansDonemAcilisKontrolu(
  supabase: Sb,
  donemId: number,
): Promise<string | null> {
  const { data: donem, error: donemErr } = await supabase
    .from('performans_donem')
    .select('id, donem_adi, durum, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (donemErr) return donemErr.message
  if (!donem) return 'Dönem bulunamadı.'
  if (donem.durum === 'Yayınlandı') return 'Yayınlanmış dönem tekrar açılamaz.'

  const { data: acikDonem } = await supabase
    .from('performans_donem')
    .select('id, donem_adi')
    .eq('durum', 'Açık')
    .neq('id', donemId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (acikDonem) {
    return `Önce ${acikDonem.donem_adi ?? `#${acikDonem.id}`} açık dönemini kapatın.`
  }

  const { data: oncekiDonem } = await supabase
    .from('performans_donem')
    .select('id, donem_adi, bitis_tarihi, kapatildi_at')
    .lt('bitis_tarihi', donem.baslangic_tarihi)
    .order('bitis_tarihi', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (oncekiDonem && !oncekiDonem.kapatildi_at) {
    return `Önceki dönem (${oncekiDonem.donem_adi ?? `#${oncekiDonem.id}`}) için kapatılma zamanı (kapatildi_at) boş. Önce o dönemi kapatın.`
  }

  return null
}

export async function performansAcikDonemVarMi(
  supabase: Sb,
  haricId?: number,
): Promise<{ id: number; donem_adi: string | null } | null> {
  let q = supabase
    .from('performans_donem')
    .select('id, donem_adi')
    .eq('durum', 'Açık')
    .order('id', { ascending: false })
    .limit(1)
  if (haricId != null) q = q.neq('id', haricId)
  const { data } = await q.maybeSingle()
  return data ?? null
}
