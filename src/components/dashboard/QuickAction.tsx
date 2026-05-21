// Quick Action Button Component
interface QuickActionProps {
  title: string
  icon: React.ReactNode
  onClick?: () => void
}

const QuickAction = ({ title, icon, onClick }: QuickActionProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-linear-to-br hover:from-blue-500 hover:to-cyan-500 text-slate-600 hover:text-white transition-all duration-300 group"
  >
    <div className="p-2 rounded-lg bg-white group-hover:bg-white/20 transition-colors">
      {icon}
    </div>
    <span className="text-xs font-medium">{title}</span>
  </button>
)

export default QuickAction
export type { QuickActionProps }
