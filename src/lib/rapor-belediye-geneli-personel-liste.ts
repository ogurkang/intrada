import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export interface BelediyeGeneliPersonelSatir {
  sicil_no: string
  ad_soyad: string
  cinsiyet: string
  statu: string
  kadro_unvani: string
  gorev_unvani: string
  kadro_mudurlugu: string
  gorev_mudurlugu: string
  ogrenim: string
  tckn: string
  sgk_ssk_sicil_no: string
  kuruma_giris_tarihi: string
  dogum_tarihi: string
  dogum_yeri: string
  baba_adi: string
  anne_adi: string
  adres: string
  cep_telefonu: string
  kan_grubu: string
}

export interface BelediyeCalisanRow extends CalisanRaporRow {
  tckn?: string | null
  dogum_yeri?: string | null
  baba_adi?: string | null
  anne_adi?: string | null
  adresi?: string | null
  telefon?: string | null
  dogum_tarihi?: string | null
  sgk_ssk_sicil_no?: string | null
  kan_grubu?: string | null
}

function txt(v: string | null | undefined) {
  const s = String(v ?? '').trim()
  return s || '—'
}

function tarih(v: string | null | undefined) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('tr-TR')
}

export function belediyeGeneliPersonelListeSnapshot(input: {
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, BelediyeCalisanRow>
  varsayilanOgrenimBySicil?: Map<string, string>
}): BelediyeGeneliPersonelSatir[] {
  const { D, kadro, calisanBySicil, varsayilanOgrenimBySicil } = input
  const byAsil = new Map<string, KadroRaporRow[]>()

  for (const r of kadro ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const out: BelediyeGeneliPersonelSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue

    out.push({
      sicil_no: sicil,
      ad_soyad: txt(calisan.ad_soyad),
      cinsiyet: txt(calisan.cinsiyet),
      statu: txt(secilen.statu),
      kadro_unvani: txt(secilen.kadro_unvani),
      gorev_unvani: txt(secilen.gorev_unvani),
      kadro_mudurlugu: txt(secilen.kadro_mudurlugu),
      gorev_mudurlugu: txt(secilen.gorev_mudurlugu),
      ogrenim: txt(varsayilanOgrenimBySicil?.get(sicil)),
      tckn: txt(calisan.tckn),
      sgk_ssk_sicil_no: txt(calisan.sgk_ssk_sicil_no),
      kuruma_giris_tarihi: tarih(kadroBaslangic(secilen)),
      dogum_tarihi: tarih(calisan.dogum_tarihi),
      dogum_yeri: txt(calisan.dogum_yeri),
      baba_adi: txt(calisan.baba_adi),
      anne_adi: txt(calisan.anne_adi),
      adres: txt(calisan.adresi),
      cep_telefonu: txt(calisan.telefon),
      kan_grubu: txt(calisan.kan_grubu),
    })
  }

  out.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))
  return out
}
