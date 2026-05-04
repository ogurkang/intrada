import Link from 'next/link'

export default function TanimlarGenelBakisPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Tanımlar</h1>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        Sol menüden ilgili tanım ekranına geçebilirsiniz. Tatil kayıtlarında kullanılacak tür etiketleri{' '}
        <Link href="/tanimlar/tatil-tur-tanimlari" className="text-teal-700 hover:underline font-medium">
          Tatil Tür Tanımları
        </Link>{' '}
        üzerinden yönetilir; bu türler <Link href="/tanimlar/tatil" className="text-teal-700 hover:underline font-medium">Tatiller</Link> ekranında
        ekleme ve düzenleme formlarında seçilebilir.
      </p>
    </div>
  )
}
