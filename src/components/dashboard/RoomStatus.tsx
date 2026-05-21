// Room Status Component
interface RoomStatusProps {
  type: string
  total: number
  occupied: number
  available: number
  cleaning: number
}

const RoomStatus = ({ type, total, occupied, available, cleaning }: RoomStatusProps) => {
  const occupancyPercent = Math.round((occupied / total) * 100)
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{type}</p>
        <p className="text-xs text-slate-400 mt-0.5">{total} beds total</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {available}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {occupied}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {cleaning}
            </span>
          </div>
        </div>
        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-linear-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 w-10">{occupancyPercent}%</span>
      </div>
    </div>
  )
}

export default RoomStatus
export type { RoomStatusProps }
