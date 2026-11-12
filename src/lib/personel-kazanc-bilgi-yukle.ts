import { createClient } from '@/lib/supabase/server'
import { anaKadroSec } from '@/lib/kadro-ana-sicil'
import { sortCalisanOgrenimByTuru } from '@/lib/ogrenim-sira'
import { fetchAllCalisanOgrenim } from '@/lib/supabase-sayfala'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import {
  personelKazancBilgiKartlariKur,
  personelKazancBilgiKapsamindaMi,
  type PersonelKazancBilgiKadro,
  type PersonelKazancBilgiKart,
  type PersonelKazancBilgiOgrenim,
} from '@/lib/personel-kazanc-bilgi'
import type { Tables } from '@/types/database'

type KadroSatir = Pick<
  Tables<'kadro_hareketleri'>,
  | 'id'
  | 'asil'
  | 'vekil'
  | 'kadro_sira_no'
  | 'kadro_unvani'
  | 'gorev_unvani'
  | 'kadro_mudurlugu'
  | 'gorev_mudurlugu'
  | 'statu'
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

function kadroSatirlariKur(sicil: string, rows: KadroSatir[]): PersonelKazancBilgiKadro[] {
  const s = sicil.trim()
  const aktif = rows.filter(r => kadroAktifMi(r.ayrilis_tarihi) && (sicilEsit(r.asil, s) || sicilEsit(r.vekil, s)))
  const asilKadro = aktif.find(k => sicilEsit(k.asil, s) && (k.durumu ?? '') === 'Dolu')
  const vekilKadrolar = aktif
    .filter(k => sicilEsit(k.vekil, s))
    .sort(
      (a, b) =>
        (Number.parseInt(a.kadro_derecesi ?? '999999', 10) || 999999) -
        (Number.parseInt(b.kadro_derecesi ?? '999999', 10) || 999999),
    )
  const ana = anaKadroSec(aktif as Tables<'kadro_hareketleri'>[], s) as KadroSatir | null
  if (!ana) return []

  const sonuc: PersonelKazancBilgiKadro[] = [
    {
      rol: asilKadro || sicilEsit(ana.asil, s) ? 'Asil' : 'Vekil',
      kadro_sira_no: ana.kadro_sira_no ?? null,
      kadro_unvani: ana.kadro_unvani ?? null,
      gorev_unvani: ana.gorev_unvani ?? null,
      kadro_mudurlugu: ana.kadro_mudurlugu ?? null,
      gorev_mudurlugu: ana.gorev_mudurlugu ?? null,
      statu: ana.statu ?? null,
      kadro_derecesi: ana.kadro_derecesi ?? null,
    },
  ]

  const digerVekiller = asilKadro ? vekilKadrolar : vekilKadrolar.slice(1)
  for (const k of digerVekiller) {
    if (k.id === ana.id) continue
    sonuc.push({
      rol: 'Vekil',
      kadro_sira_no: k.kadro_sira_no ?? null,
      kadro_unvani: k.kadro_unvani ?? null,
      gorev_unvani: k.gorev_unvani ?? null,
      kadro_mudurlugu: k.kadro_mudurlugu ?? null,
      gorev_mudurlugu: k.gorev_mudurlugu ?? null,
      statu: k.statu ?? null,
      kadro_derecesi: k.kadro_derecesi ?? null,
    })
  }
  return sonuc
}

async function yukleKadroBySicil(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siciller: string[],
): Promise<Map<string, PersonelKazancBilgiKadro[]>> {
  const map = new Map<string, PersonelKazancBilgiKadro[]>()
  if (!siciller.length) return map

  const rows: KadroSatir[] = []
  const CHUNK = 80
  for (let i = 0; i < siciller.length; i += CHUNK) {
    const chunk = siciller.slice(i, i + CHUNK)
    const { data } = await supabase
      .from('kadro_hareketleri')
      .select(
        'id, asil, vekil, kadro_sira_no, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, statu, kadro_derecesi, durumu, ayrilis_tarihi',
      )
      .or(chunk.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))
      .is('ayrilis_tarihi', null)
    rows.push(...((data ?? []) as KadroSatir[]))
  }

  const bySicil = new Map<string, KadroSatir[]>()
  for (const row of rows) {
    for (const s of [row.asil, row.vekil]) {
      const sicil = (s ?? '').trim()
      if (!sicil || !siciller.includes(sicil)) continue
      const list = bySicil.get(sicil)
      if (list) list.push(row)
      else bySicil.set(sicil, [row])
    }
  }

  for (const sicil of siciller) {
    map.set(sicil, kadroSatirlariKur(sicil, bySicil.get(sicil) ?? []))
  }
  return map
}

async function yukleGorevAyligi(
  supabase: Awaited<ReturnType<typeof createClient>>,
  terfiIds: number[],
): Promise<Map<number, { derece: string | null; kademe: string | null }>> {
  const map = new Map<number, { derece: string | null; kademe: string | null }>()
  if (!terfiIds.length) return map
  const CHUNK = 100
  for (let i = 0; i < terfiIds.length; i += CHUNK) {
    const chunk = terfiIds.slice(i, i + CHUNK)
    const { data } = await supabase
      .from('terfi_hareketleri')
      .select('id, gorev_ayligi_derece, gorev_ayligi_kademe')
      .in('id', chunk)
    for (const row of data ?? []) {
      map.set(row.id, {
        derece: row.gorev_ayligi_derece ?? null,
        kademe: row.gorev_ayligi_kademe ?? null,
      })
    }
  }
  return map
}

type OgrenimSatir = {
  sicil_no: string
  ogrenim_turu: string | null
  meslegi: string | null
  varsayilan: boolean | null
  aktif: boolean | null
  kadrosu_ile_ilgili: boolean | null
  teknik_ogrenim: boolean | null
}

async function yukleOgrenimBySicil(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siciller: string[],
): Promise<Map<string, PersonelKazancBilgiOgrenim[]>> {
  const map = new Map<string, PersonelKazancBilgiOgrenim[]>()
  if (!siciller.length) return map

  const rows: OgrenimSatir[] = []
  const CHUNK = 80
  for (let i = 0; i < siciller.length; i += CHUNK) {
    const chunk = siciller.slice(i, i + CHUNK)
    const { data } = await fetchAllCalisanOgrenim<OgrenimSatir>(
      supabase,
      'sicil_no, ogrenim_turu, meslegi, varsayilan, aktif, kadrosu_ile_ilgili, teknik_ogrenim',
      q => q.in('sicil_no', chunk),
    )
    rows.push(...(data ?? []))
  }

  const bySicil = new Map<string, OgrenimSatir[]>()
  for (const row of rows) {
    const sicil = String(row.sicil_no ?? '').trim()
    if (!sicil) continue
    const list = bySicil.get(sicil)
    if (list) list.push(row)
    else bySicil.set(sicil, [row])
  }

  for (const sicil of siciller) {
    const sorted = sortCalisanOgrenimByTuru(bySicil.get(sicil) ?? [])
    map.set(
      sicil,
      sorted.map(o => ({
        ogrenim_turu: o.ogrenim_turu ?? null,
        meslegi: o.meslegi ?? null,
        varsayilan: o.varsayilan === true || (o.varsayilan == null && o.aktif === true),
        kadrosu_ile_ilgili: o.kadrosu_ile_ilgili === true,
        teknik_ogrenim: o.teknik_ogrenim === true,
      })),
    )
  }
  return map
}

export async function yuklePersonelKazancBilgiKartlari(
  sicilFiltre?: string[],
): Promise<PersonelKazancBilgiKart[]> {
  const supabase = await createClient()
  const { kaynaklar } = await yukleTerfiEttirKaynakVeKazanc(supabase)

  const grup = new Map<string, typeof kaynaklar>()
  for (const k of kaynaklar) {
    const list = grup.get(k.sicil_no)
    if (list) list.push(k)
    else grup.set(k.sicil_no, [k])
  }

  let siciller = [...grup.entries()]
    .filter(([, list]) => personelKazancBilgiKapsamindaMi(list))
    .map(([sicil]) => sicil)

  if (sicilFiltre?.length) {
    const set = new Set(sicilFiltre.map(s => s.trim()).filter(Boolean))
    siciller = siciller.filter(s => set.has(s))
  }

  const kaynakAlt = kaynaklar.filter(k => siciller.includes(k.sicil_no))
  const terfiIds = [
    ...new Set(kaynakAlt.map(k => k.terfi_id).filter((id): id is number => id != null && id > 0)),
  ]

  const [kadroBySicil, ogrenimBySicil, gorevAyligiByTerfiId] = await Promise.all([
    yukleKadroBySicil(supabase, siciller),
    yukleOgrenimBySicil(supabase, siciller),
    yukleGorevAyligi(supabase, terfiIds),
  ])

  return personelKazancBilgiKartlariKur({
    kaynaklar: kaynakAlt,
    kadroBySicil,
    ogrenimBySicil,
    gorevAyligiByTerfiId,
  })
}
