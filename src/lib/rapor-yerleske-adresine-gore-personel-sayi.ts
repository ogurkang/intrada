/**
 * Yerleşke adresine göre personel sayısı — müdürlük × yerleşke matrisi.
 */

import {
  etkinYerleskeId,
  mudurlukYerleskeHaritasi,
  normMudStr,
  type MudurlukYerleskeTanimSatir,
  yerleskeRaporSatirKey,
} from '@/lib/yerleske-adresi'
import type { FirmaRaporRow, KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { etiketAnahtari, kadroBaslangic, kadroSatirAktifMi } from '@/lib/rapor-statuye-gore-cinsiyet'
import { trNormalize } from '@/lib/turkce-search'

export const BELEDIYE_STATU_ETIKETLERI = [
  'Memur',
  'Sözleşmeli',
  'İşçi',
  'Geçici İşçi',
  'Meclis Üyesi',
  'Stajyer',
  'Belediye Başkanı',
] as const

const BELEDIYE_NORM = new Set(BELEDIYE_STATU_ETIKETLERI.map(s => trNormalize(s)))

export interface YerleskePersonelSayiSatir {
  mudurlukId: number
  mudurlukAdi: string
  yerleskeId: number
  yerleskeAdi: string
  adabel: number
  belediye: number
  toplam: number
}

export interface CalisanYerleskeRow {
  sicil_no: string
  yerleske_adresi_id: number | null
}

function personelMudurlukKadro(k: KadroRaporRow): string {
  const g = String(k.gorev_mudurlugu ?? '').trim()
  const kd = String(k.kadro_mudurlugu ?? '').trim()
  return g || kd
}

function belediyePersoneliMi(
  statuRaw: string | null | undefined,
  gorevUnvani: string | null | undefined,
  etiketler: Set<string>,
): boolean {
  const etiket = etiketAnahtari(etiketler, statuRaw)
  if (BELEDIYE_NORM.has(trNormalize(etiket))) return true
  const unvanNorm = trNormalize(String(gorevUnvani ?? ''))
  if (unvanNorm.includes('belediye') && unvanNorm.includes('baskan') && !unvanNorm.includes('yardimci')) {
    return true
  }
  return false
}

function raporSatirlariniHazirla(
  tanimSatirlar: MudurlukYerleskeTanimSatir[],
): Map<string, YerleskePersonelSayiSatir> {
  const map = new Map<string, YerleskePersonelSayiSatir>()
  const sorted = [...tanimSatirlar].sort((a, b) => {
    const ms = (a.mudurluk_sira_no ?? 9999) - (b.mudurluk_sira_no ?? 9999)
    if (ms !== 0) return ms
    const ma = a.mudurluk_adi.localeCompare(b.mudurluk_adi, 'tr')
    if (ma !== 0) return ma
    const ys = (a.yerleske_sira_no ?? 9999) - (b.yerleske_sira_no ?? 9999)
    if (ys !== 0) return ys
    return a.yerleske_adi.localeCompare(b.yerleske_adi, 'tr')
  })
  for (const r of sorted) {
    const key = yerleskeRaporSatirKey(r.mudurluk_id, r.yerleske_adresi_id)
    if (map.has(key)) continue
    map.set(key, {
      mudurlukId: r.mudurluk_id,
      mudurlukAdi: r.mudurluk_adi,
      yerleskeId: r.yerleske_adresi_id,
      yerleskeAdi: r.yerleske_adi,
      adabel: 0,
      belediye: 0,
      toplam: 0,
    })
  }
  return map
}

function mudIdByAdi(tanimSatirlar: MudurlukYerleskeTanimSatir[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of tanimSatirlar) {
    m.set(normMudStr(r.mudurluk_adi), r.mudurluk_id)
  }
  return m
}

export function yerleskePersonelSayiSnapshot(params: {
  D: string
  tanimSatirlar: MudurlukYerleskeTanimSatir[]
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
  calisanYerleske: CalisanYerleskeRow[]
  etiketler: Set<string>
}): { satirlar: YerleskePersonelSayiSatir[] } {
  const { D, tanimSatirlar, kadro, firma, calisanYerleske, etiketler } = params
  const satirMap = raporSatirlariniHazirla(tanimSatirlar)
  const yerleskeHarita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const mudIdMap = mudIdByAdi(tanimSatirlar)
  const yerleskeBySicil = new Map(calisanYerleske.map(c => [c.sicil_no, c.yerleske_adresi_id]))

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const k of kadro) {
    const asil = String(k.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(k)
    byAsil.set(asil, list)
  }

  function artir(mudurlukAdi: string, yerleskeId: number | null, tip: 'belediye' | 'adabel') {
    const mudId = mudIdMap.get(normMudStr(mudurlukAdi))
    if (!mudId || yerleskeId == null) return
    const key = yerleskeRaporSatirKey(mudId, yerleskeId)
    const row = satirMap.get(key)
    if (!row) return
    if (tip === 'belediye') row.belediye++
    else row.adabel++
    row.toplam++
  }

  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const sec = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    if (!belediyePersoneliMi(sec.statu, sec.gorev_unvani, etiketler)) continue
    const mud = personelMudurlukKadro(sec)
    const yId = etkinYerleskeId(yerleskeHarita, mud, yerleskeBySicil.get(sicil))
    artir(mud, yId, 'belediye')
  }

  for (const f of firma) {
    const ay = String(f.ayrilis_tarihi ?? '').slice(0, 10)
    if (ay && ay <= D) continue
    const kg = String(f.kuruma_giris_tarihi ?? '').slice(0, 10)
    if (kg && kg > D) continue
    const mud = String(f.gorev_mudurlugu ?? '').trim()
    const yId = varsayilanYerleskeOnly(yerleskeHarita, mud)
    artir(mud, yId, 'adabel')
  }

  const satirlar = [...satirMap.values()]
  return { satirlar }
}

function varsayilanYerleskeOnly(
  harita: ReturnType<typeof mudurlukYerleskeHaritasi>,
  mudurlukAdi: string,
): number | null {
  const list = harita.get(normMudStr(mudurlukAdi)) ?? []
  return list[0]?.id ?? null
}
