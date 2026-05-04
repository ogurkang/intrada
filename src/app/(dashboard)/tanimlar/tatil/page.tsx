import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TatilClient from '@/components/tanimlar/TatilClient'
import { tatilEkle, tatilGuncelle, tatilToggleDurum } from './actions'
import type { Tables } from '@/types/database'

type Tatil = Tables<'tanim_izin_tatil'>
type TatilTur = Tables<'tanim_izin_tatil_tur'>

function tatilTurSecenekleriOlustur(tatiller: Tatil[], turKayitlari: TatilTur[]): string[] {
  const sortedTurlar = [...turKayitlari].sort((a, b) => {
    const sa = a.sira_no ?? 9999
    const sb = b.sira_no ?? 9999
    if (sa !== sb) return sa - sb
    return a.tur_adi.localeCompare(b.tur_adi, 'tr')
  })
  const aktif = sortedTurlar.filter(t => t.aktif).map(t => t.tur_adi.trim()).filter(Boolean)
  const set = new Set(aktif)
  const legacy: string[] = []
  for (const h of tatiller) {
    const v = String(h.tatil_turu ?? '').trim()
    if (v && !set.has(v)) {
      set.add(v)
      legacy.push(v)
    }
  }
  legacy.sort((a, b) => a.localeCompare(b, 'tr'))
  return [...aktif, ...legacy]
}

export default async function TatilPage() {
  const supabase = await createClient()
  const [{ data, error }, { data: turData, error: turErr }] = await Promise.all([
    supabase.from('tanim_izin_tatil').select('*').order('tatil_baslangici', { ascending: false }),
    supabase.from('tanim_izin_tatil_tur').select('*'),
  ])
  const tatiller = (data ?? []) as Tatil[]
  const turKayitlari = (turData ?? []) as TatilTur[]
  const tatilTurSecenekleri = tatilTurSecenekleriOlustur(tatiller, turKayitlari)

  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      {turErr && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
          Tatil türleri yüklenirken uyarı: {turErr.message}. Tür listesi boş olabilir;{' '}
          <Link href="/tanimlar/tatil-tur-tanimlari" className="underline font-medium">
            Tatil Tür Tanımları
          </Link>{' '}
          ekranından kayıt ekleyin.
        </div>
      )}
      <TatilClient
        data={tatiller}
        tatilTurSecenekleri={tatilTurSecenekleri}
        onAdd={tatilEkle}
        onUpdate={tatilGuncelle}
        onToggle={tatilToggleDurum}
      />
    </>
  )
}
