/** Kullanıcı rolü: ana sayfada yalnızca karşılama (kurumsal özet yok). */
export default function KullaniciAnaSayfa({
  adSoyad,
  kullaniciAdi,
}: {
  adSoyad: string
  kullaniciAdi: string | null
}) {
  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <p className="text-lg text-slate-600">Hoş geldiniz,</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{adSoyad}</p>
        {kullaniciAdi ? (
          <p className="mt-4 text-sm text-slate-500">
            Kullanıcı adınız:{' '}
            <span className="font-mono font-semibold text-slate-700">{kullaniciAdi}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
