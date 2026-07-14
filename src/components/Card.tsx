export function Card({ title, value, icon, trend }: { title: string; value: string; icon?: string; trend?: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-500">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {trend && (
        <div className="mt-2 flex items-center text-sm">
          <span className={`${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}
