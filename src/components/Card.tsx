export function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-base font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
