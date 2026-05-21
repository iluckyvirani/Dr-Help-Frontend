import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  StatCard,
  QuickAction,
  ActivityItem,
  UpcomingAppointment
} from '../../components/dashboard'
import { dashboardAPI } from '../../api/endpoints'

interface DashboardStats {
  todayOPD: { count: number; change: number }
  todayRevenue: number
  totalServices: number
  totalExpense: number
}

interface RevenueDay {
  day: string
  opd: number
}

interface Activity {
  title: string
  description: string
  time: string
  type: 'opd' | 'payment'
}

interface Appointment {
  patient: string
  doctor: string
  time: string
  type: string
  token?: number
}

// Main Dashboard Page
const DashboardPage = () => {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [loading, setLoading] = useState(true)
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDay[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const [statsRes, activitiesRes, appointmentsRes] = await Promise.all([
          dashboardAPI.getStats(selectedPeriod),
          dashboardAPI.getRecentActivities(),
          dashboardAPI.getUpcomingAppointments(),
        ])
        const statsData = statsRes.data.data
        setDashStats(statsData.stats)
        setRevenueData(statsData.revenueData || [])
        setActivities(activitiesRes.data.data || [])
        setAppointments(appointmentsRes.data.data || [])
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [selectedPeriod])

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`
  }

  const periodLabel = selectedPeriod === 'today' ? "Today's" : selectedPeriod === 'week' ? "This Week's" : "This Month's"
  const prevLabel = selectedPeriod === 'today' ? 'yesterday' : selectedPeriod === 'week' ? 'last week' : 'last month'

  const stats = [
    {
      title: `${periodLabel} OPD`,
      value: dashStats?.todayOPD.count ?? 0,
      change: `${Number(dashStats?.todayOPD.change ?? 0) >= 0 ? '+' : ''}${dashStats?.todayOPD.change ?? 0}% from ${prevLabel}`,
      changeType: Number(dashStats?.todayOPD.change ?? 0) >= 0 ? 'increase' as const : 'decrease' as const,
      color: 'bg-blue-100',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      title: `${periodLabel} Revenue`,
      value: `₹${(dashStats?.todayRevenue ?? 0).toLocaleString('en-IN')}`,
      change: '',
      changeType: 'neutral' as const,
      color: 'bg-amber-100',
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Total Services',
      value: dashStats?.totalServices ?? 0,
      change: '',
      changeType: 'neutral' as const,
      color: 'bg-cyan-100',
      icon: (
        <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-9 4h6m-7 4h8a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: `${periodLabel} Expense`,
      value: `₹${(dashStats?.totalExpense ?? 0).toLocaleString('en-IN')}`,
      change: '',
      changeType: 'neutral' as const,
      color: 'bg-red-100',
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const maxRevenue = Math.max(...(revenueData.length ? revenueData.map(d => d.opd) : [1]))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${selectedPeriod === period
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-4">
          <QuickAction
            title="New OPD"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            onClick={() => navigate('/opd/register')}
          />
          <QuickAction
            title="Generate Bill"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>}
            onClick={() => navigate('/billing/generate')}
          />
          <QuickAction
            title="Add Expense"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            onClick={() => navigate('/expenses')}
          />
          <QuickAction
            title="Reports"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            onClick={() => navigate('/reports')}
          />
          <QuickAction
            title="Patients"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            onClick={() => navigate('/patients')}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Revenue Overview</h2>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-52">
            {revenueData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1" style={{ height: '180px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-lg transition-all duration-500 hover:bg-blue-400"
                    style={{ height: `${(item.opd / maxRevenue) * 100}%` }}
                    title={`OPD: ₹${item.opd.toLocaleString()}`}
                  />
                </div>
                <span className="text-xs text-slate-500">{item.day}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-xl font-bold text-slate-800">₹{revenueData.reduce((s, d) => s + d.opd, 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">OPD Revenue</p>
              <p className="text-xl font-bold text-blue-600">₹{revenueData.reduce((s, d) => s + d.opd, 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-1">
            {activities.map((activity, index) => (
              <ActivityItem key={index} {...activity} time={formatTime(activity.time)} />
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Upcoming OPD</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {appointments.map((appointment, index) => (
              <UpcomingAppointment key={index} {...appointment} />
            ))}
          </div>

          {/* Today Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Today's OPD</span>
              <span className="font-semibold text-slate-800">{dashStats?.todayOPD.count ?? 0} total</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-500">Remaining</span>
              <span className="font-semibold text-blue-600">{appointments.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage