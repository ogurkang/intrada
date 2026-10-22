'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ickSayfa } from '@/lib/ick/erisim'

const CEREZ = 'ick_onizleme'

export async function ickOnizlemeBaslat(form: FormData) {
  const { db, yetki } = await ickSayfa()
  if (!yetki.onizlemeAcabilir) return
  const sicil = String(form.get('sicil') ?? '').trim()
  if (!sicil) return
  const { data } = await db.from('ick_eylem_kisi').select('sicil_no').eq('sicil_no', sicil).limit(1)
  if (!data?.length) return
  const jar = await cookies()
  jar.set(CEREZ, sicil, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  redirect('/ic-kontrol/genel-bakis')
}

export async function ickOnizlemeBitir() {
  const jar = await cookies()
  jar.delete(CEREZ)
  redirect('/ic-kontrol/genel-bakis')
}
