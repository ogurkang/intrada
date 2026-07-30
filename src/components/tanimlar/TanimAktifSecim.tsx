/** Tanımlar düzenleme modallarında aktif/pasif seçimi */
export default function TanimAktifSecim({ defaultAktif }: { defaultAktif: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">Durum</label>
      <select
        name="aktif"
        defaultValue={defaultAktif ? 'aktif' : 'pasif'}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        <option value="aktif">Aktif</option>
        <option value="pasif">Pasif</option>
      </select>
    </div>
  )
}
