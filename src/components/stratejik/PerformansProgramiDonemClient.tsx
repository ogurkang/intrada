'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'

export interface PpDonem {
  id: number
  yil: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

export type PpHizliHedef = { id: number; ad: string }
export type PpHizliFaaliyet = { id: number; ad: string; hedefler: PpHizliHedef[] }
export type PpHizliAlt = { id: number; ad: string; faaliyetler: PpHizliFaaliyet[] }
export type PpHizliProgram = { id: number; ad: string; altlar: PpHizliAlt[] }
export type PpHizliYil = { yil: number; programlar: PpHizliProgram[] }

interface Props {
  donemler: PpDonem[]
  hizli: PpHizliYil[]
}

function tarihAralik(baslangic: string, bitis: string) {
  const b = new Date(baslangic).toLocaleDateString('tr-TR')
  const s = new Date(bitis).toLocaleDateString('tr-TR')
  return `${b} - ${s}`
}

export default function PerformansProgramiDonemClient({ donemler, hizli }: Props) {
  const [acikYil, setAcikYil] = useState<number | null>(null)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Performans Programı İşlemler</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Göz', metin: 'O yılın program listesini açar.' },
              { baslik: 'Ok', metin: 'Pencerede başlık seçilir. Git, o başlığın listesine gider. Performans Faaliyetleri, ilk hedefin faaliyet listesini açar.' },
            ]} />
          </div>
          <p className="text-sm text-slate-500 mt-1">Stratejik plan dönemlerine göre performans programı kaydı oluşturabilirsiniz.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-center w-20">Sıra No</th>
                <th className="px-4 py-3 text-left">Dönem Adı</th>
                <th className="px-4 py-3 text-left">Dönem Aralığı</th>
                <th className="px-4 py-3 text-center w-56">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donemler.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Kayıtlı dönem bulunamadı.
                  </td>
                </tr>
              ) : (
                donemler.map((d, i) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi}</td>
                    <td className="px-4 py-3 text-slate-600">{tarihAralik(d.baslangic_tarihi, d.bitis_tarihi)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/stratejik-yonetim/performans-programi/islemler/${d.yil}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title="Programlar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setAcikYil(d.yil)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title="Hızlı erişim"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <HizliErisim
        key={acikYil ?? 0}
        yil={acikYil}
        agac={hizli.find(h => h.yil === acikYil)}
        onClose={() => setAcikYil(null)}
      />
    </div>
  )
}

const BASLIKLAR = [
  ['program', 'Program'],
  ['alt', 'Alt Program'],
  ['faaliyet', 'Faaliyet'],
  ['hedef', 'Alt Program Hedefi'],
  ['pf', 'Performans Faaliyetleri'],
] as const

const selectSinif = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

function baslikAdresi(yil: number, asama: string, agac?: PpHizliYil): string | null {
  const kok = `/stratejik-yonetim/performans-programi/islemler/${yil}`
  if (asama === 'program') return kok
  const program = agac?.programlar?.[0]
  if (!program) return null
  if (asama === 'alt') return `${kok}/${program.id}`
  const alt = program.altlar[0]
  if (!alt) return null
  if (asama === 'faaliyet') return `${kok}/${program.id}/${alt.id}/faaliyetler`
  const faaliyet = alt.faaliyetler[0]
  if (!faaliyet) return null
  if (asama === 'hedef') return `${kok}/${program.id}/${alt.id}/faaliyetler/${faaliyet.id}`
  const hedef = faaliyet.hedefler[0]
  if (!hedef) return null
  if (asama === 'pf') return `/stratejik-yonetim/performans-programi/hedef/${hedef.id}`
  return null
}

function HizliErisim({ yil, agac, onClose }: { yil: number | null; agac?: PpHizliYil; onClose: () => void }) {
  const router = useRouter()
  const [asama, setAsama] = useState('')
  const [uyari, setUyari] = useState<string | null>(null)

  function kapat() {
    setAsama('')
    setUyari(null)
    onClose()
  }

  function git() {
    if (!yil || !asama) return
    const href = baslikAdresi(yil, asama, agac)
    if (!href) {
      setUyari('Bu başlık henüz eklenmemiş.')
      return
    }
    kapat()
    router.push(href)
  }

  return (
    <Modal open={yil != null} onClose={kapat} title={yil ? `${yil} hızlı erişim` : 'Hızlı erişim'} size="sm">
      <div className="space-y-3">
        <label className="block text-sm text-slate-700">Başlık
          <select value={asama} onChange={e => { setAsama(e.target.value); setUyari(null) }} className={selectSinif}>
            <option value="">Seçin</option>
            {BASLIKLAR.map(([id, ad]) => <option key={id} value={id}>{ad}</option>)}
          </select>
        </label>
        {uyari ? <p className="text-sm text-amber-700">{uyari}</p> : null}
        <div className="flex justify-end pt-1">
          <button type="button" onClick={git} disabled={!asama} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            Git
          </button>
        </div>
      </div>
    </Modal>
  )
}
