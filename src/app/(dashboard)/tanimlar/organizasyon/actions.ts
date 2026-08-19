'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikPayload,
} from '@/lib/personel-audit'
import {
  ORGANIZASYON_ALAN_ETIKETLERI,
  organizasyonAuditSnapshot,
} from '@/lib/organizasyon-audit'

const LISTE = '/tanimlar/organizasyon'
const REF_TABLE = 'tanim_organizasyon'
const MODUL = 'tanim_organizasyon'

async function auditYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizasyonId: number,
  islem: string,
  ozet: string,
  onceki: unknown,
  sonraki: unknown,
) {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: '—',
    modul: MODUL,
    islem,
    ozet,
    ref_table: REF_TABLE,
    ref_id: String(organizasyonId),
    onceki,
    sonraki,
  })
}

export async function organizasyonEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const organizasyon_adi = String(formData.get('organizasyon_adi') ?? '').trim()
  if (!organizasyon_adi) return { hata: 'Organizasyon adı boş bırakılamaz.' }
  const aktif = String(formData.get('aktif') ?? 'true') === 'true'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_organizasyon')
    .insert({ organizasyon_adi, aktif })
    .select('id, organizasyon_adi, aktif')
    .single()

  if (error) return { hata: error.message }

  await auditYaz(
    supabase,
    data.id,
    'Ekle',
    `Organizasyon eklendi (${organizasyon_adi}).`,
    {},
    organizasyonAuditSnapshot(data),
  )

  revalidatePath(LISTE)
  return {}
}

export async function organizasyonGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const organizasyon_adi = String(formData.get('organizasyon_adi') ?? '').trim()
  if (!organizasyon_adi) return { hata: 'Organizasyon adı boş bırakılamaz.' }
  const aktif = String(formData.get('aktif') ?? 'true') === 'true'

  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('tanim_organizasyon')
    .select('id, organizasyon_adi, aktif')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('tanim_organizasyon')
    .update({ organizasyon_adi, aktif })
    .eq('id', id)
    .select('id, organizasyon_adi, aktif')
    .single()

  if (error) return { hata: error.message }

  const degisiklikler = alanDegisiklikleriHesapla(
    organizasyonAuditSnapshot(onceki ?? {}),
    organizasyonAuditSnapshot(data),
    ORGANIZASYON_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await auditYaz(
      supabase,
      id,
      'Güncelle',
      `Organizasyon güncellendi (${organizasyon_adi}).`,
      payload.onceki,
      payload.sonraki,
    )
  }

  revalidatePath(LISTE)
  revalidatePath(`${LISTE}/${id}`)
  return {}
}

export async function organizasyonToggleAktif(id: number, mevcutAktif: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('tanim_organizasyon')
    .select('organizasyon_adi')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_organizasyon')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }

  const ad = mevcut?.organizasyon_adi ?? `#${id}`
  await auditYaz(
    supabase,
    id,
    'Durum',
    `Organizasyon ${!mevcutAktif ? 'aktif' : 'pasif'} yapıldı (${ad}).`,
    { aktif: mevcutAktif },
    { aktif: !mevcutAktif },
  )

  revalidatePath(LISTE)
  return {}
}

const OZEL_BIRIM_ETIKET: Record<string, string> = {
  baskan: 'Belediye Başkanı',
  baskan_yardimcisi: 'Belediye Başkan Yardımcısı',
}

async function birimGosterimAdi(
  supabase: Awaited<ReturnType<typeof createClient>>,
  birimId: number,
): Promise<string> {
  const { data } = await supabase
    .from('tanim_organizasyon_birim')
    .select('birim_turu, tanim_mudurluk ( mudurluk_adi )')
    .eq('id', birimId)
    .maybeSingle()
  if (!data) return `#${birimId}`
  const row = data as { birim_turu: string; tanim_mudurluk: { mudurluk_adi: string } | null }
  if (row.birim_turu !== 'mudurluk') return OZEL_BIRIM_ETIKET[row.birim_turu] ?? row.birim_turu
  return row.tanim_mudurluk?.mudurluk_adi ?? `#${birimId}`
}

type BirimGirdi =
  | { birim_turu: 'baskan'; mudurluk_id: null; personel_sicil_no: null }
  | { birim_turu: 'baskan_yardimcisi'; mudurluk_id: null; personel_sicil_no: string }
  | { birim_turu: 'mudurluk'; mudurluk_id: number; personel_sicil_no: null }

function birimGirdiCozumle(raw: string): BirimGirdi | null {
  const v = raw.trim()
  if (!v) return null
  if (v === 'baskan') return { birim_turu: 'baskan', mudurluk_id: null, personel_sicil_no: null }
  if (v.startsWith('byrd:')) {
    const sicil = v.slice('byrd:'.length).trim()
    if (!sicil) return null
    return { birim_turu: 'baskan_yardimcisi', mudurluk_id: null, personel_sicil_no: sicil }
  }
  if (v.startsWith('m:')) {
    const n = Number(v.slice('m:'.length).trim())
    if (!Number.isInteger(n) || n <= 0) return null
    return { birim_turu: 'mudurluk', mudurluk_id: n, personel_sicil_no: null }
  }
  return null
}

export async function birimEkle(organizasyonId: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const ham = formData.getAll('birimler').map(v => String(v))
  const girdiler: BirimGirdi[] = []
  for (const r of ham) {
    const c = birimGirdiCozumle(r)
    if (!c) return { hata: 'Geçersiz birim seçimi.' }
    girdiler.push(c)
  }
  if (girdiler.length === 0) return { hata: 'En az bir birim seçilmelidir.' }

  const ustRaw = String(formData.get('ust_birim_id') ?? '').trim()
  let ust_birim_id: number | null = null
  if (ustRaw) {
    const n = Number(ustRaw)
    if (!Number.isInteger(n) || n <= 0) return { hata: 'Bağlı olduğu birim geçersiz.' }
    ust_birim_id = n
  }

  const supabase = await createClient()

  // Üst birim seçildiyse aynı organizasyona ait olmalı; müdürlük yalnızca makama bağlanır.
  let ustBirimAdi: string | null = null
  let ustBirimTuru: string | null = null
  if (ust_birim_id !== null) {
    const { data: ust } = await supabase
      .from('tanim_organizasyon_birim')
      .select('id, organizasyon_id, birim_turu')
      .eq('id', ust_birim_id)
      .maybeSingle()
    if (!ust || ust.organizasyon_id !== organizasyonId) {
      return { hata: 'Bağlı olduğu birim bu organizasyona ait değil.' }
    }
    ustBirimTuru = ust.birim_turu
    ustBirimAdi = await birimGosterimAdi(supabase, ust_birim_id)
  }

  const mudurlukVar = girdiler.some(gr => gr.birim_turu === 'mudurluk')
  if (mudurlukVar) {
    if (ust_birim_id === null) {
      return { hata: 'Müdürlük bir makama (Belediye Başkanı veya Başkan Yardımcısı) bağlanmalıdır.' }
    }
    if (ustBirimTuru !== 'baskan' && ustBirimTuru !== 'baskan_yardimcisi') {
      return { hata: 'Müdürlük müdürlüğe bağlanamaz; yalnızca Belediye Başkanı veya Başkan Yardımcısına bağlanır.' }
    }
  }

  // Eklenecek satırlar: Başkan her zaman en üst (üst birim almaz), diğerleri seçilen üst birime bağlanır.
  const { data: mevcutSira } = await supabase
    .from('tanim_organizasyon_birim')
    .select('sira_no, ust_birim_id')
    .eq('organizasyon_id', organizasyonId)

  const maxByUst = new Map<string, number>()
  for (const row of mevcutSira ?? []) {
    const key = row.ust_birim_id == null ? 'null' : String(row.ust_birim_id)
    maxByUst.set(key, Math.max(maxByUst.get(key) ?? 0, row.sira_no ?? 0))
  }

  const satirlar = girdiler.map(gr => {
    const ust = gr.birim_turu === 'baskan' ? null : ust_birim_id
    const key = ust == null ? 'null' : String(ust)
    const next = (maxByUst.get(key) ?? 0) + 1
    maxByUst.set(key, next)
    return {
      organizasyon_id: organizasyonId,
      mudurluk_id: gr.mudurluk_id,
      birim_turu: gr.birim_turu,
      personel_sicil_no: gr.personel_sicil_no,
      ust_birim_id: ust,
      sira_no: next,
    }
  })

  const { error } = await supabase.from('tanim_organizasyon_birim').insert(satirlar)
  if (error) {
    if (error.code === '23505') return { hata: 'Seçilen birimlerden biri organizasyona zaten eklenmiş.' }
    return { hata: error.message }
  }

  // Audit özeti için birim adlarını çöz.
  const mudIdler = girdiler.filter(gr => gr.birim_turu === 'mudurluk').map(gr => gr.mudurluk_id as number)
  const siciller = girdiler
    .filter(gr => gr.birim_turu === 'baskan_yardimcisi')
    .map(gr => gr.personel_sicil_no as string)
  const [{ data: mudRows }, { data: kisiRows }] = await Promise.all([
    mudIdler.length
      ? supabase.from('tanim_mudurluk').select('id, mudurluk_adi').in('id', mudIdler)
      : Promise.resolve({ data: [] as { id: number; mudurluk_adi: string }[] }),
    siciller.length
      ? supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
      : Promise.resolve({ data: [] as { sicil_no: string; ad_soyad: string }[] }),
  ])
  const mudAd = new Map((mudRows ?? []).map(m => [m.id, m.mudurluk_adi]))
  const kisiAd = new Map((kisiRows ?? []).map(k => [k.sicil_no, k.ad_soyad]))

  const adlar = girdiler.map(gr => {
    if (gr.birim_turu === 'mudurluk') return mudAd.get(gr.mudurluk_id) ?? `#${gr.mudurluk_id}`
    if (gr.birim_turu === 'baskan') return OZEL_BIRIM_ETIKET.baskan
    const ad = kisiAd.get(gr.personel_sicil_no)
    return ad ? `${OZEL_BIRIM_ETIKET.baskan_yardimcisi} (${ad})` : OZEL_BIRIM_ETIKET.baskan_yardimcisi
  })

  const birimMetni = adlar.join(', ')
  await auditYaz(
    supabase,
    organizasyonId,
    'Birim Ekle',
    `${adlar.length} birim eklendi: ${birimMetni}${ustBirimAdi ? ` (bağlı: ${ustBirimAdi})` : ' (en üst birim)'}.`,
    {},
    { birim: birimMetni, ust_birim: ustBirimAdi ?? '—' },
  )

  revalidatePath(`${LISTE}/${organizasyonId}`)
  revalidatePath(LISTE)
  return {}
}

export async function birimSil(birimId: number, organizasyonId: number): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const supabase = await createClient()
  const birimAdi = await birimGosterimAdi(supabase, birimId)

  const { error } = await supabase
    .from('tanim_organizasyon_birim')
    .delete()
    .eq('id', birimId)

  if (error) return { hata: error.message }

  await auditYaz(
    supabase,
    organizasyonId,
    'Birim Çıkar',
    `Birim çıkarıldı: ${birimAdi}.`,
    { birim: birimAdi },
    {},
  )

  revalidatePath(`${LISTE}/${organizasyonId}`)
  revalidatePath(LISTE)
  return {}
}
