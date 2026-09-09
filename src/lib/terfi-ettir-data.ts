import { fetchAllCalisan, fetchAllCalisanOgrenim } from '@/lib/supabase-sayfala'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import type { KazancPuan, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'

type KadroEslestirmeSatir = Pick<
  Tables<'kadro_hareketleri'>,
  | 'id'
  | 'asil'
  | 'vekil'
  | 'gorev_unvan_id'
  | 'kadro_unvan_id'
  | 'gorev_unvani'
  | 'kadro_unvani'
  | 'kadro_derecesi'
  | 'durumu'
  | 'ayrilis_tarihi'
>

function sicilEsit(a: string | null | undefined, b: string): boolean {
  return (a ?? '').trim() === b.trim()
}

function kadroAktifMi(ayrilis: string | null | undefined, bugun = new Date().toISOString().slice(0, 10)): boolean {
  const t = String(ayrilis ?? '').trim().slice(0, 10)
  if (!t) return true
  return t > bugun
}

async function yukleKadroSatirlariMemurIcin(
  supabase: SupabaseClient<Database>,
  memurSiciller: string[],
): Promise<KadroEslestirmeSatir[]> {
  if (!memurSiciller.length) return []
  const CHUNK = 80
  const rows: KadroEslestirmeSatir[] = []
  for (let i = 0; i < memurSiciller.length; i += CHUNK) {
    const chunk = memurSiciller.slice(i, i + CHUNK)
    const { data } = await supabase
      .from('kadro_hareketleri')
      .select(
        'id, asil, vekil, gorev_unvan_id, kadro_unvan_id, gorev_unvani, kadro_unvani, kadro_derecesi, durumu, ayrilis_tarihi',
      )
      .or(chunk.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))
    rows.push(...((data ?? []) as KadroEslestirmeSatir[]))
  }
  return rows
}

/** Personel detay / Terfi Bilgileri ile uyumlu ana kadro seçimi. */
function secilenKadroSatir(sicil: string, khRows: KadroEslestirmeSatir[]): KadroEslestirmeSatir | null {
  const s = sicil.trim()
  const ilgili = khRows.filter(r => sicilEsit(r.asil, s) || sicilEsit(r.vekil, s))
  if (!ilgili.length) return null

  const aktif = ilgili.filter(r => kadroAktifMi(r.ayrilis_tarihi))
  const ana = anaKadroSec(aktif as Tables<'kadro_hareketleri'>[], s)
  if (ana) return ana as KadroEslestirmeSatir

  const fallbackAktif = [...aktif].sort((a, b) => b.id - a.id)[0]
  if (fallbackAktif) return fallbackAktif

  return [...ilgili].sort((a, b) => b.id - a.id)[0] ?? null
}

function khaDereceDoluMu(kha: string | null | undefined): boolean {
  return Number.isFinite(Number.parseInt(String(kha ?? '').trim(), 10))
}

/**
 * Sicil başına terfi kaydı seçimi.
 * En yeni kaydı körlemesine almak, kapsam dışı veya KHA’sı boş bir kopyayı
 * asıl/vekil kadro kayıtlarının önüne geçirebiliyor (ör. sicil 246).
 * Öncelik: kapsam içi → tercih edilen kadroya bağlı → KHA derecesi dolu → kayıt zamanı.
 */
function terfiKaydiSec(
  kayitlar: Tables<'terfi_hareketleri'>[],
  tercihKadroId?: number | null,
): Tables<'terfi_hareketleri'> | null {
  if (!kayitlar.length) return null
  const kapsamIci = kayitlar.filter(k => !k.kapsam_disi)
  const havuz = kapsamIci.length ? kapsamIci : kayitlar

  const kadroId = tercihKadroId != null && tercihKadroId > 0 ? tercihKadroId : null
  const kadroyaBagli = kadroId != null ? havuz.filter(k => k.kadro_id === kadroId) : []
  const aday = kadroyaBagli.length ? kadroyaBagli : havuz

  const khaDolu = aday.filter(k => khaDereceDoluMu(k.kha_derece))
  const secim = khaDolu.length ? khaDolu : aday
  return [...secim].sort((a, b) => b.kayit_zamani.localeCompare(a.kayit_zamani))[0] ?? null
}

function eslestirOgrenimId(
  ogrenimTuru: string | null | undefined,
  tanimlar: { id: number; isim: string }[],
): number | null {
  const t = (ogrenimTuru ?? '').trim().toLowerCase()
  if (!t) return null
  for (const o of tanimlar) {
    if (o.isim.trim().toLowerCase() === t) return o.id
  }
  for (const o of tanimlar) {
    const n = o.isim.trim().toLowerCase()
    if (t.includes(n) || n.includes(t)) return o.id
  }
  return null
}

/**
 * Terfi Ettir önizlemesi için memur kaynakları + kazanç lookup haritası.
 */
export async function yukleTerfiEttirKaynakVeKazanc(
  supabase: SupabaseClient<Database>,
): Promise<{
  kaynaklar: TerfiKaynak[]
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null
  kazancEntries: Array<{ key: string; puan: KazancPuan }>
  tanimOgList: { id: number; isim: string }[]
  memurPersoneller: { sicil_no: string; ad_soyad: string; alt?: string }[]
}> {
  const [{ data: kayitlar }, { data: calisanlar }, { data: kadroOzet }, { data: phRaw }, { data: tanimOg }] =
    await Promise.all([
      supabase.from('terfi_hareketleri').select('*').order('sicil_no'),
      fetchAllCalisan<{ sicil_no: string; ad_soyad: string | null; bilgisayar_kullaniyor: boolean | null }>(
        supabase,
        'sicil_no, ad_soyad, bilgisayar_kullaniyor',
      ),
      supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, gorev_unvani, statu').order('sicil_no'),
      supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi, ayrilis_nedeni').order('yururluk_tarihi', { ascending: false }),
      supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true),
    ])

  const sonAyrilisHaritasi = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const aktifSiciller = new Set<string>()
  ;(calisanlar ?? []).forEach((c) => {
    if (personelAktifMi(sonAyrilisHaritasi.get(c.sicil_no))) aktifSiciller.add(c.sicil_no)
  })

  const kadroMap = new Map((kadroOzet ?? []).map((k) => [k.sicil_no, k]))
  const yetkinlikBySicil = new Map<string, boolean | null>()
  for (const c of calisanlar ?? []) {
    yetkinlikBySicil.set(c.sicil_no, c.bilgisayar_kullaniyor ?? null)
  }
  const terfiBySicil = new Map<string, Tables<'terfi_hareketleri'>[]>()
  for (const k of kayitlar ?? []) {
    const list = terfiBySicil.get(k.sicil_no)
    if (list) list.push(k)
    else terfiBySicil.set(k.sicil_no, [k])
  }
  const terfiMap: Record<string, Tables<'terfi_hareketleri'>> = {}
  for (const [sicil, list] of terfiBySicil) {
    const sec = terfiKaydiSec(list)
    if (sec) terfiMap[sicil] = sec
  }

  const memurSiciller = [...aktifSiciller].filter((sicil) => {
    const row = kadroMap.get(sicil) as { statu?: string } | undefined
    return row?.statu === 'Memur'
  })

  const ogrenimTuruBySicil = new Map<string, string>()
  if (memurSiciller.length > 0) {
    const { data: ogRes } = await fetchAllCalisanOgrenim(supabase, 'sicil_no, ogrenim_turu, kayit_zamani', q => q.in('sicil_no', memurSiciller).eq('aktif', true))
    ;(ogRes ?? []).sort((a, b) => String(b.kayit_zamani ?? '').localeCompare(String(a.kayit_zamani ?? '')))
    const seenOg = new Set<string>()
    for (const o of ogRes ?? []) {
      if (seenOg.has(o.sicil_no)) continue
      seenOg.add(o.sicil_no)
      const tt = (o.ogrenim_turu ?? '').trim()
      if (tt) ogrenimTuruBySicil.set(o.sicil_no, tt)
    }
  }

  const khRows = await yukleKadroSatirlariMemurIcin(supabase, memurSiciller)
  const unvanIdBySicil = new Map<string, number>()
  const kadroUnvaniBySicil = new Map<string, string | null>()
  const kadroDerecesiBySicil = new Map<string, string | null>()
  for (const sicil of memurSiciller) {
    const r = secilenKadroSatir(sicil, khRows)
    if (!r) continue
    kadroDerecesiBySicil.set(sicil, r.kadro_derecesi ?? null)
    kadroUnvaniBySicil.set(sicil, r.kadro_unvani ?? null)
    const uid = r.gorev_unvan_id ?? r.kadro_unvan_id
    if (uid != null) unvanIdBySicil.set(sicil, uid)
    const sec = terfiKaydiSec(terfiBySicil.get(sicil) ?? [], r.id)
    if (sec) terfiMap[sicil] = sec
  }

  const unvanIdList = [...new Set(unvanIdBySicil.values())]
  const sinifByUnvanId = new Map<number, string | null>()
  if (unvanIdList.length > 0) {
    const { data: unvanSinifRaw } = await supabase
      .from('tanim_unvan')
      .select('id, sinif_adi')
      .in('id', unvanIdList)
    for (const u of unvanSinifRaw ?? []) {
      sinifByUnvanId.set(u.id, u.sinif_adi ?? null)
    }
  }

  const { data: kazancRaw } = await supabase.from('tanim_kazanc_bilgisi').select('*')
  const kazancMap = new Map<string, KazancPuan>()
  for (const row of kazancRaw ?? []) {
    kazancMap.set(`${row.unvan_id}-${row.ogrenim_id}-${row.derece}`, {
      ek_gosterge: row.ek_gosterge,
      ek_odeme: row.ek_odeme,
      oht: row.oht,
      yan_odeme: row.yan_odeme,
      yan_odeme_eksi5: row.yan_odeme_eksi5,
      yan_odeme_bilgisayarsiz: row.yan_odeme_bilgisayarsiz,
      sds_orani: row.sds_orani,
    })
  }

  const tanimOgList = sortTanimOgrenimByIsim((tanimOg ?? []).map((o) => ({ id: o.id, isim: o.isim })))
  const kaynaklar: TerfiKaynak[] = []

  for (const sicil_no of memurSiciller.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))) {
    const t = terfiMap[sicil_no]
    if (!t) continue
    const k = kadroMap.get(sicil_no)
    const ogId = eslestirOgrenimId(ogrenimTuruBySicil.get(sicil_no), tanimOgList)
    const unvanId = unvanIdBySicil.get(sicil_no) ?? null
    kaynaklar.push({
      sicil_no,
      ad_soyad: t.ad_soyad ?? k?.ad_soyad ?? sicil_no,
      unvan_adi: kadroUnvaniBySicil.get(sicil_no) ?? k?.gorev_unvani ?? null,
      unvan_sinif: unvanId != null ? (sinifByUnvanId.get(unvanId) ?? null) : null,
      kadro_derecesi: kadroDerecesiBySicil.get(sicil_no) ?? null,
      ogrenim_turu: ogrenimTuruBySicil.get(sicil_no) ?? null,
      ogrenim_id: ogId,
      unvan_id: unvanId,
      kha_derece: t.kha_derece,
      kha_kademe: t.kha_kademe,
      kha_tarihi: t.kha_tarihi,
      ekea_derece: t.ekea_derece,
      ekea_kademe: t.ekea_kademe,
      ekea_tarihi: t.ekea_tarihi,
      kidem_yili: t.kidem_yili,
      kidem_tarihi: t.kidem_tarihi,
      iyi_hal_terfi_tarihi: t.iyi_hal_terfi_tarihi,
      ek_gosterge: t.ek_gosterge,
      ek_odeme: t.ek_odeme,
      oht: t.oht,
      yan_odeme: t.yan_odeme,
      yan_odeme_eksi5: t.yan_odeme_eksi5,
      sds_orani: t.sds_orani,
      terfi_id: t.id,
      bilgisayar_kullaniyor: yetkinlikBySicil.get(sicil_no) ?? null,
    })
  }

  const kazancLookup = (unvanId: number, ogrenimId: number, derece: number): KazancPuan | null =>
    kazancMap.get(`${unvanId}-${ogrenimId}-${derece}`) ?? null

  const kazancEntries = [...kazancMap.entries()].map(([key, puan]) => ({ key, puan }))

  const memurPersoneller = memurSiciller
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
    .map(sicil_no => {
      const k = kadroMap.get(sicil_no)
      return {
        sicil_no,
        ad_soyad: terfiMap[sicil_no]?.ad_soyad ?? k?.ad_soyad ?? sicil_no,
        alt: ogrenimTuruBySicil.get(sicil_no) ? `Öğrenim: ${ogrenimTuruBySicil.get(sicil_no)}` : undefined,
      }
    })

  return { kaynaklar, kazancLookup, kazancEntries, tanimOgList, memurPersoneller }
}
