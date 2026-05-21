// Stats Card Component
interface StatCardProps {
  title: string
  value: string | number
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: string
}

const StatCard = ({ title, value, change, changeType, icon, color }: StatCardProps) => {
  const changeColors = {
    increase: 'text-emerald-500 bg-emerald-50',
    decrease: 'text-red-500 bg-red-50',
    neutral: 'text-slate-500 bg-slate-50',
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-3 ${changeColors[changeType]}`}>
            {changeType === 'increase' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {changeType === 'decrease' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {change}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default StatCard
export type { StatCardProps }
