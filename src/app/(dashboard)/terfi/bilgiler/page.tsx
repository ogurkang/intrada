import { createClient } from '@/lib/supabase/server'
import TerfiClient from '@/components/personel/TerfiClient'
import { terfiEkle, terfiGuncelle, terfiSil, terfiTopluKaydet, terfiKadroyaBagla, terfiKapsamDisiYap } from '../actions'
import { terfiKayitlariIndeksle, terfiKaydiEsle } from '@/lib/terfi-kadro-esleme'
import type { Tables } from '@/types/database'

export default async function TerfiBilgilerPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)
  const aktifMi = (ayrilis: string | null | undefined) => {
    const t = String(ayrilis ?? '').trim().slice(0, 10)
    if (!t) return true
    return t > D
  }

  const [{ data: kayitlar }, { data: calisanlar }, { data: kadroOzet }, { data: phRaw }, { data: auditRaw }] = await Promise.all([
    supabase.from('terfi_hareketleri').select('*').order('sicil_no'),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('sicil_no'),
    supabase
      .from('personel_kadro_ozet')
      .select('sicil_no, ad_soyad, gorev_unvani, gorev_mudurlugu, statu')
      .order('sicil_no'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase
      .from('personel_audit_log')
      .select('*')
      .eq('ref_table', 'terfi_hareketleri')
      .order('created_at', { ascending: false }),
  ])

  const auditLoglarByTerfiId: Record<string, Tables<'personel_audit_log'>[]> = {}
  for (const log of auditRaw ?? []) {
    const refId = String(log.ref_id ?? '').trim()
    if (!refId) continue
    if (!auditLoglarByTerfiId[refId]) auditLoglarByTerfiId[refId] = []
    auditLoglarByTerfiId[refId].push(log as Tables<'personel_audit_log'>)
  }

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const aktifSiciller = new Set<string>()
  ;(calisanlar ?? []).forEach((c) => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })

  const calisanMap = new Map((calisanlar ?? []).map((c) => [c.sicil_no, c]))
  const kadroMap = new Map((kadroOzet ?? []).map((k) => [k.sicil_no, k]))

  const terfiIndeks = terfiKayitlariIndeksle((kayitlar ?? []) as Tables<'terfi_hareketleri'>[])

  const memurSiciller = [...aktifSiciller].filter((sicil) => {
    const k = kadroMap.get(sicil) as { statu?: string } | undefined
    return k?.statu === 'Memur'
  })

  const ogrenimTuruBySicil = new Map<string, string>()
  const khRows: { id: number; asil: string | null; vekil: string | null; kadro_derecesi: string | null; kadro_sira_no: string | null; ayrilis_tarihi: string | null }[] = []

  if (memurSiciller.length > 0) {
    const [ogRes, khRes] = await Promise.all([
      supabase
        .from('calisan_ogrenim')
        .select('sicil_no, ogrenim_turu, kayit_zamani')
        .in('sicil_no', memurSiciller)
        .eq('aktif', true)
        .order('kayit_zamani', { ascending: false }),
      supabase
        .from('kadro_hareketleri')
        .select('id, asil, vekil, kadro_derecesi, kadro_sira_no, ayrilis_tarihi')
        .or(
          memurSiciller.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','),
        ),
    ])

    const seenOg = new Set<string>()
    for (const o of ogRes.data ?? []) {
      if (seenOg.has(o.sicil_no)) continue
      seenOg.add(o.sicil_no)
      const tt = (o.ogrenim_turu ?? '').trim()
      if (tt) ogrenimTuruBySicil.set(o.sicil_no, tt)
    }

    for (const r of khRes.data ?? []) {
      khRows.push({
        id: r.id,
        asil: r.asil,
        vekil: r.vekil,
        kadro_derecesi: r.kadro_derecesi,
        kadro_sira_no: r.kadro_sira_no ?? null,
        ayrilis_tarihi: r.ayrilis_tarihi ?? null,
      })
    }
  }

  type KadroRol = 'Asil' | 'Vekil'
  type KadroSecenek = {
    id: number
    rol: KadroRol
    kadro_sira_no: string | null
    kadro_derecesi: string | null
    label: string
  }
  const kadroSecenekleriBySicil: Record<string, KadroSecenek[]> = {}

  for (const r of khRows) {
    if (!aktifMi(r.ayrilis_tarihi)) continue
    const baseLabel = (sira: string | null, derece: string | null, rol: KadroRol) =>
      `${rol} · Sıra ${sira ?? '—'} · Derece ${derece ?? '—'}`
    if (r.asil) {
      const sicil = r.asil
      if (!kadroSecenekleriBySicil[sicil]) kadroSecenekleriBySicil[sicil] = []
      kadroSecenekleriBySicil[sicil].push({
        id: r.id,
        rol: 'Asil',
        kadro_sira_no: r.kadro_sira_no,
        kadro_derecesi: r.kadro_derecesi,
        label: baseLabel(r.kadro_sira_no, r.kadro_derecesi, 'Asil'),
      })
    }
    if (r.vekil) {
      const sicil = r.vekil
      if (!kadroSecenekleriBySicil[sicil]) kadroSecenekleriBySicil[sicil] = []
      kadroSecenekleriBySicil[sicil].push({
        id: r.id,
        rol: 'Vekil',
        kadro_sira_no: r.kadro_sira_no,
        kadro_derecesi: r.kadro_derecesi,
        label: baseLabel(r.kadro_sira_no, r.kadro_derecesi, 'Vekil'),
      })
    }
  }

  const eslesmemis = ((kayitlar ?? []) as Tables<'terfi_hareketleri'>[])
    .filter(k => k.kadro_id == null && !k.kapsam_disi)
    .sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr') || a.id - b.id)

  const eslesmemisSiciller = [...new Set(eslesmemis.map(e => e.sicil_no))]
  const kadrosuzSiciller = eslesmemisSiciller.filter(s => !(kadroSecenekleriBySicil[s]?.length))
  if (kadrosuzSiciller.length > 0) {
    const { data: ekKhRes } = await supabase
      .from('kadro_hareketleri')
      .select('id, asil, vekil, kadro_derecesi, kadro_sira_no, ayrilis_tarihi')
      .or(kadrosuzSiciller.map(s => `asil.eq.${s},vekil.eq.${s}`).join(','))
    for (const r of ekKhRes ?? []) {
      if (!aktifMi(r.ayrilis_tarihi)) continue
      const baseLabel = (sira: string | null, derece: string | null, rol: KadroRol) =>
        `${rol} · Sıra ${sira ?? '—'} · Derece ${derece ?? '—'}`
      if (r.asil && kadrosuzSiciller.includes(r.asil)) {
        const sicil = r.asil
        if (!kadroSecenekleriBySicil[sicil]) kadroSecenekleriBySicil[sicil] = []
        if (!kadroSecenekleriBySicil[sicil].some(x => x.id === r.id)) {
          kadroSecenekleriBySicil[sicil].push({
            id: r.id,
            rol: 'Asil',
            kadro_sira_no: r.kadro_sira_no ?? null,
            kadro_derecesi: r.kadro_derecesi,
            label: baseLabel(r.kadro_sira_no ?? null, r.kadro_derecesi, 'Asil'),
          })
        }
      }
      if (r.vekil && kadrosuzSiciller.includes(r.vekil)) {
        const sicil = r.vekil
        if (!kadroSecenekleriBySicil[sicil]) kadroSecenekleriBySicil[sicil] = []
        if (!kadroSecenekleriBySicil[sicil].some(x => x.id === r.id)) {
          kadroSecenekleriBySicil[sicil].push({
            id: r.id,
            rol: 'Vekil',
            kadro_sira_no: r.kadro_sira_no ?? null,
            kadro_derecesi: r.kadro_derecesi,
            label: baseLabel(r.kadro_sira_no ?? null, r.kadro_derecesi, 'Vekil'),
          })
        }
      }
    }
  }

  const memurlar: {
    liste_satir_id: string
    sicil_no: string
    ad_soyad: string
    gorev_unvani: string | null
    gorev_mudurlugu: string | null
    terfi: Tables<'terfi_hareketleri'> | null
    ogrenim_turu: string | null
    kadro_rolu: KadroRol | null
    kadro_derecesi: string | null
    kadro_sira_no: string | null
    kadro_id: number | null
  }[] = []

  for (const sicil_no of [...memurSiciller].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))) {
    const c = calisanMap.get(sicil_no)
    const k = kadroMap.get(sicil_no)
    const base = {
      sicil_no,
      ad_soyad: c?.ad_soyad ?? k?.ad_soyad ?? sicil_no,
      gorev_unvani: k?.gorev_unvani ?? null,
      gorev_mudurlugu: k?.gorev_mudurlugu ?? null,
      ogrenim_turu: ogrenimTuruBySicil.get(sicil_no) ?? null,
    }

    const hits: { khId: number; rol: KadroRol; kadro_derecesi: string | null; kadro_sira_no: string | null }[] = []
    for (const r of khRows) {
      if (!aktifMi(r.ayrilis_tarihi)) continue
      if (r.asil === sicil_no) hits.push({ khId: r.id, rol: 'Asil', kadro_derecesi: r.kadro_derecesi, kadro_sira_no: r.kadro_sira_no })
      if (r.vekil === sicil_no) hits.push({ khId: r.id, rol: 'Vekil', kadro_derecesi: r.kadro_derecesi, kadro_sira_no: r.kadro_sira_no })
    }

    if (hits.length === 0) {
      // Aktif eşleşme yoksa (geçmiş/format farkı vb.), son kadro kaydından role/dereceyi dene.
      const fallback = [...khRows]
        .filter(r => r.asil === sicil_no || r.vekil === sicil_no)
        .sort((a, b) => b.id - a.id)[0]
      if (fallback) {
        const rol = fallback.asil === sicil_no ? 'Asil' : 'Vekil'
        memurlar.push({
          ...base,
          liste_satir_id: `${sicil_no}-kh${fallback.id}-fallback`,
          terfi: terfiKaydiEsle(terfiIndeks, sicil_no, rol, fallback.kadro_sira_no, fallback.id),
          kadro_rolu: rol,
          kadro_derecesi: fallback.kadro_derecesi,
          kadro_sira_no: fallback.kadro_sira_no,
          kadro_id: fallback.id,
        })
      } else {
        memurlar.push({
          ...base,
          liste_satir_id: `${sicil_no}-yok`,
          terfi: null,
          kadro_rolu: null,
          kadro_derecesi: null,
          kadro_sira_no: null,
          kadro_id: null,
        })
      }
    } else {
      for (const h of hits) {
        memurlar.push({
          ...base,
          liste_satir_id: `${sicil_no}-kh${h.khId}-${h.rol}`,
          terfi: terfiKaydiEsle(terfiIndeks, sicil_no, h.rol, h.kadro_sira_no, h.khId),
          kadro_rolu: h.rol,
          kadro_derecesi: h.kadro_derecesi,
          kadro_sira_no: h.kadro_sira_no,
          kadro_id: h.khId,
        })
      }
    }
  }

  return (
    <TerfiClient
      kayitlar={kayitlar ?? []}
      calisanlar={(calisanlar ?? []).map((c) => ({
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad ?? c.sicil_no,
        unvan: null,
        mudurluk: null,
      }))}
      memurlar={memurlar}
      eslesmemis={eslesmemis}
      kadroSecenekleriBySicil={kadroSecenekleriBySicil}
      onEkle={terfiEkle}
      onGuncelle={terfiGuncelle}
      onSil={terfiSil}
      onTopluKaydet={terfiTopluKaydet}
      onKadroyaBagla={terfiKadroyaBagla}
      onKapsamDisiYap={terfiKapsamDisiYap}
      auditLoglarByTerfiId={auditLoglarByTerfiId}
    />
  )
}
