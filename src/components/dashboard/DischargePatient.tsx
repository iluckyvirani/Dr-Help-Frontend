// DischargePatient component (create this in your components folder)
// Room Status Component
interface RoomStatusProps {
    name: string
    time?: string
    room: string
    status: 'completed' | 'pending' | 'ready'
}

const DischargePatient = ({ name, time, room, status }: RoomStatusProps) => {
    const statusColors = {
        completed: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-amber-100 text-amber-700',
        ready: 'bg-blue-100 text-blue-700'
    };

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">
                        {name.split(' ').map(n => n[0]).join('')}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-slate-800">{name}</p>
                    <p className="text-xs text-slate-500">Room {room} • {time}</p>
                </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        </div>
    );
};

export default DischargePatient
export type { RoomStatusProps }
