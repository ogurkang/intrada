import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const id = Number.parseInt(new URL(req.url).searchParams.get('id') ?? '', 10)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Geçersiz belge.' }, { status: 400 })
  }
  return NextResponse.redirect(new URL(`/denetim/onizle?tur=karar&id=${id}`, req.url))
}
