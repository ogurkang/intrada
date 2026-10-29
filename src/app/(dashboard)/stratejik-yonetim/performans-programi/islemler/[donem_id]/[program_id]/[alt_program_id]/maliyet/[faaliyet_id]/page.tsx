import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpFaaliyetMaliyetClient, { type PpMaliyetKod } from '@/components/stratejik/PpFaaliyetMaliyetClient'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'
import { fetchAllPaged, fetchAllTable } from '@/lib/supabase-sayfala'

export default async function FaaliyetMaliyetPage({
  params,
  searchParams,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string; faaliyet_id: string }>
  searchParams: Promise<{ ozel?: string }>
}) {
  const p = await params
  const ozel = (await searchParams).ozel === '1'
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altProgramId = Number.parseInt(p.alt_program_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (![yil, programId, altProgramId, faaliyetId].every(Number.isFinite)) notFound()

  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: faaliyet } = ozel
    ? await sb.from('performans_programi_ozel_faaliyet').select('id, faaliyet_adi, alt_hedef_id').eq('id', faaliyetId).eq('alt_program_id', altProgramId).eq('yil', yil).maybeSingle()
    : await sb.from('stratejik_plan_faaliyet').select('id, faaliyet_adi, alt_hedef_id').eq('id', faaliyetId).maybeSingle()
  const altHedefId = Number(faaliyet?.alt_hedef_id)
  if (!faaliyet || !Number.isFinite(altHedefId)) notFound()
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id')
    .eq('alt_program_id', altProgramId)
    .eq('alt_hedef_id', altHedefId)
    .maybeSingle()
  if (!bag) notFound()
  const { data: altHedef } = await sb.from('stratejik_plan_alt_hedef').select('mudurluk, kodu, alt_hedef_adi').eq('id', altHedefId).maybeSingle()
  const mudurluk = String(altHedef?.mudurluk ?? '').trim()
  const secici = await ppMaliyetSeciciMi(supabase, ot.access)
  if (!secici) {
    if (ot.access.mode !== 'kullanici') notFound()
    const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, ot.access.sicilNo)
    if (!mudurlukler.some(m => ppNorm(m) === ppNorm(mudurluk))) notFound()
  }

  const [{ data: kodRaw }, { data: girisRaw }] = await Promise.all([
    fetchAllTable<{ id: number; ekonomik_kod: string; hesap_adi: string }>(sb, 'performans_programi_butce_kodu', 'id, ekonomik_kod, hesap_adi', {
      orderColumn: 'ekonomik_kod',
      apply: q => q.in('adim_1', ['03', '05', '06']).eq('aktif', true),
    }),
    fetchAllPaged<{ butce_kodu_id: number; tutar: number | null }>((from, to) => {
      const q = sb.from(ozel ? 'performans_programi_ozel_faaliyet_butce' : 'performans_programi_faaliyet_butce').select('butce_kodu_id, tutar').eq('yil', yil).eq('mudurluk', mudurluk)
      return (ozel ? q.eq('ozel_faaliyet_id', faaliyetId) : q.eq('faaliyet_id', faaliyetId)).order('id').range(from, to)
    }),
  ])
  const tutarByKod = new Map<number, number>(
    (girisRaw ?? []).map((r: { butce_kodu_id: number; tutar: number | null }) => [Number(r.butce_kodu_id), r.tutar == null ? 0 : Number(r.tutar)]),
  )
  const kodlar: PpMaliyetKod[] = (kodRaw ?? []).map((k: { id: number; ekonomik_kod: string; hesap_adi: string }) => ({
    id: k.id,
    ekonomik_kod: k.ekonomik_kod,
    hesap_adi: k.hesap_adi,
    tutar: tutarByKod.has(k.id) ? (tutarByKod.get(k.id) ?? 0) : null,
  }))

  return (
    <div className="space-y-4">
      <Link href={`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Alt Program Hedefi
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{String(faaliyet.faaliyet_adi)}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {String(altHedef?.kodu ?? '')} {String(altHedef?.alt_hedef_adi ?? '')} · {mudurluk} · {yil} · 4. düzey ödenek
        </p>
      </div>
      <PpFaaliyetMaliyetClient
        yil={yil}
        altProgramId={altProgramId}
        programId={programId}
        faaliyetId={faaliyetId}
        kodlar={kodlar}
        ozel={ozel}
      />
    </div>
  )
}
