// Upcoming Appointment Component
interface AppointmentProps {
  patient: string
  doctor: string
  time: string
  type: string
}

const UpcomingAppointment = ({ patient, doctor, time, type }: AppointmentProps) => (
  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
      {patient.split(' ').map(n => n[0]).join('')}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-800 truncate">{patient}</p>
      <p className="text-xs text-slate-500">{doctor} • {type}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-slate-700">{time}</p>
    </div>
  </div>
)

export default UpcomingAppointment
export type { AppointmentProps }
