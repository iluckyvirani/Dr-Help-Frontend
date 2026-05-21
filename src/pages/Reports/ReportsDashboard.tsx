import React, { useState, useEffect } from 'react'
import { Button, Select } from '../../components/ui'
import { reportAPI } from '../../api/endpoints'

// Types
type ReportType = 'revenue' | 'patient' | 'financial' | 'operational'
type DateRange = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'this-year' | 'custom'

interface DailyData { date: string; opd: number; services: number }
interface PaymentMode { mode: string; percentage: number; amount: number }
interface DoctorRevenue { name: string; specialization: string; opd: number }
interface OpdRegisterEntry { token: string; name: string; age: number; phone: string; doctor: string; fee: number; status: string }
interface OutstandingBill { billId: string; patient: string; amount: number; dueDate: string; days: number }
interface CollectionEntry { date: string; cash: number; card: number; upi: number; cheque: number; total: number }
interface DoctorPerformance { name: string; opdPatients: number; revenue: number; avgRating: number }
interface ServiceUsage { service: string; count: number; revenue: number }

interface RevenueData { summary: { opdRevenue: number; serviceRevenue: number; totalRevenue: number }; dailyData: DailyData[]; doctorWise: DoctorRevenue[]; paymentModes: PaymentMode[] }
interface PatientData { summary: { totalPatients: number; newPatients: number; opdVisits: number }; opdRegister: OpdRegisterEntry[] }
interface FinancialData { incomeStatement: { revenue: { opd: number; services: number; other: number; total: number }; expenses: { salaries: number; rent: number; supplies: number; utilities: number; equipment: number; total: number }; netProfit: number; profitMargin: number }; outstanding: OutstandingBill[]; deposits: unknown[]; collections: CollectionEntry[] }
interface OperationalData { doctorPerformance: DoctorPerformance[]; serviceUsage: ServiceUsage[] }

const ReportsDashboard = () => {
  const [activeSection, setActiveSection] = useState<ReportType>('revenue')
  const [dateRange, setDateRange] = useState<DateRange>('this-month')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [, setLoading] = useState(true)

  const [revenueData, setRevenueData] = useState<RevenueData>({ summary: { opdRevenue: 0, serviceRevenue: 0, totalRevenue: 0 }, dailyData: [], doctorWise: [], paymentModes: [] })
  const [patientData, setPatientData] = useState<PatientData>({ summary: { totalPatients: 0, newPatients: 0, opdVisits: 0 }, opdRegister: [] })
  const [financialData, setFinancialData] = useState<FinancialData>({ incomeStatement: { revenue: { opd: 0, services: 0, other: 0, total: 0 }, expenses: { salaries: 0, rent: 0, supplies: 0, utilities: 0, equipment: 0, total: 0 }, netProfit: 0, profitMargin: 0 }, outstanding: [], deposits: [], collections: [] })
  const [operationalData, setOperationalData] = useState<OperationalData>({ doctorPerformance: [], serviceUsage: [] })

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [revRes, patRes, finRes, opsRes] = await Promise.all([
          reportAPI.get('revenue', { dateRange }),
          reportAPI.get('patient', { dateRange }),
          reportAPI.get('financial', { dateRange }),
          reportAPI.get('operational', { dateRange })
        ])
        setRevenueData(revRes.data.data || revenueData)
        setPatientData(patRes.data.data || patientData)
        setFinancialData(finRes.data.data || financialData)
        setOperationalData(opsRes.data.data || operationalData)
      } catch (err) {
        console.error('Failed to fetch reports:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [dateRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    // Export functionality placeholder
    alert(`Exporting report as ${format.toUpperCase()}...`)
  }

  const handlePrint = () => {
    window.print()
  }

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  // Revenue Reports Section
  const RevenueReports = () => (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xl">🏥</span>
            </div>
            <span className="text-slate-600 text-sm">OPD Revenue</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenueData.summary.opdRevenue)}</p>
          <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <span className="text-xl">🔬</span>
            </div>
            <span className="text-slate-600 text-sm">Services</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenueData.summary.serviceRevenue)}</p>
          <p className="text-xs text-red-600 mt-1">↓ 3% from last month</p>
        </div>

        <div className="bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <span className="text-white/80 text-sm">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(revenueData.summary.totalRevenue)}</p>
          <p className="text-xs text-white/80 mt-1">↑ 10% from last month</p>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Revenue Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {revenueData.dailyData.slice(-7).map((day, index) => {
              const total = day.opd + day.services
              const maxHeight = 200
              const height = (total / 300000) * maxHeight
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: maxHeight }}>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: (day.opd / (total || 1)) * height }} title={`OPD: ${formatCurrency(day.opd)}`} />
                    <div className="w-full bg-orange-500 rounded-b" style={{ height: (day.services / (total || 1)) * height }} title={`Services: ${formatCurrency(day.services)}`} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-sm" />
              <span className="text-xs text-slate-600">OPD</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-sm" />
              <span className="text-xs text-slate-600">Services</span>
            </div>
          </div>
        </div>

        {/* Payment Mode Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Mode Distribution</h3>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {revenueData.paymentModes.reduce((acc, mode, index) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']
                  const offset = acc.offset
                  const dash = mode.percentage
                  acc.elements.push(
                    <circle
                      key={index}
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke={colors[index]}
                      strokeWidth="3"
                      strokeDasharray={`${dash} ${100 - dash}`}
                      strokeDashoffset={-offset}
                    />
                  )
                  acc.offset += dash
                  return acc
                }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenueData.summary.totalRevenue)}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {revenueData.paymentModes.map((mode, index) => {
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500']
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-3 h-3 ${colors[index]} rounded-sm`} />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{mode.mode}</p>
                    <p className="text-xs text-slate-500">{mode.percentage}% • {formatCurrency(mode.amount)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Doctor-wise Revenue */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Doctor-wise Revenue</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Doctor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Specialization</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">OPD Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {revenueData.doctorWise.map((doctor, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                        {doctor.name.charAt(4)}
                      </div>
                      <span className="font-medium text-slate-800">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{doctor.specialization}</td>
                  <td className="py-3 px-4 text-right text-slate-800">{formatCurrency(doctor.opd)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(doctor.opd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={2} className="py-3 px-4 font-semibold text-slate-800">Total</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">
                  {formatCurrency(revenueData.doctorWise.reduce((sum, d) => sum + d.opd, 0))}
                </td>
                <td className="py-3 px-4 text-right font-bold text-blue-600">
                  {formatCurrency(revenueData.doctorWise.reduce((sum, d) => sum + d.opd, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )

  // Patient Reports Section
  const PatientReports = () => (
    <div className="space-y-6">
      {/* Patient Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Patients', value: patientData.summary.totalPatients, icon: '👥', color: 'bg-blue-100' },
          { label: 'New Patients', value: patientData.summary.newPatients, icon: '✨', color: 'bg-green-100' },
          { label: 'OPD Visits', value: patientData.summary.opdVisits, icon: '🏥', color: 'bg-purple-100' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* OPD Register */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">OPD Register</h3>
          <span className="text-sm text-slate-500">Today's Patients</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Token</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Patient Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Age</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Doctor</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Fee</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {patientData.opdRegister.map((patient, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-blue-600">{patient.token}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{patient.name}</td>
                  <td className="py-3 px-4 text-slate-600">{patient.age}</td>
                  <td className="py-3 px-4 text-slate-600">{patient.phone}</td>
                  <td className="py-3 px-4 text-slate-600">{patient.doctor}</td>
                  <td className="py-3 px-4 text-right text-slate-800">{formatCurrency(patient.fee)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      patient.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      patient.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  )

  // Financial Reports Section
  const FinancialReports = () => (
    <div className="space-y-6">
      {/* Income Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue Breakdown</h3>
          <SimpleBarChart
            data={[
              { label: 'OPD', value: financialData.incomeStatement.revenue.opd, color: 'bg-blue-500' },
              { label: 'Services', value: financialData.incomeStatement.revenue.services, color: 'bg-orange-500' },
              { label: 'Other', value: financialData.incomeStatement.revenue.other, color: 'bg-slate-500' },
            ]}
            maxValue={financialData.incomeStatement.revenue.opd}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
            <span className="font-medium text-slate-700">Total Revenue</span>
            <span className="font-bold text-green-600">{formatCurrency(financialData.incomeStatement.revenue.total)}</span>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Expense Breakdown</h3>
          <SimpleBarChart
            data={[
              { label: 'Salaries', value: financialData.incomeStatement.expenses.salaries, color: 'bg-red-500' },
              { label: 'Rent', value: financialData.incomeStatement.expenses.rent, color: 'bg-pink-500' },
              { label: 'Supplies', value: financialData.incomeStatement.expenses.supplies, color: 'bg-amber-500' },
              { label: 'Utilities', value: financialData.incomeStatement.expenses.utilities, color: 'bg-yellow-500' },
              { label: 'Equipment', value: financialData.incomeStatement.expenses.equipment, color: 'bg-indigo-500' },
            ]}
            maxValue={financialData.incomeStatement.expenses.salaries}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
            <span className="font-medium text-slate-700">Total Expenses</span>
            <span className="font-bold text-red-600">{formatCurrency(financialData.incomeStatement.expenses.total)}</span>
          </div>
        </div>
      </div>

      {/* Profit & Loss Summary */}
      <div className="bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Profit & Loss Summary - March 2026</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(financialData.incomeStatement.revenue.total)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(financialData.incomeStatement.expenses.total)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Net Profit</p>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(financialData.incomeStatement.netProfit)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Profit Margin</p>
            <p className="text-2xl font-bold text-green-300">{financialData.incomeStatement.profitMargin}%</p>
          </div>
        </div>
      </div>

      {/* Outstanding Bills */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Outstanding Bills</h3>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {financialData.outstanding.length} Pending
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Bill ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Patient</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Due Date</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {financialData.outstanding.map((bill, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-blue-600">{bill.billId}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{bill.patient}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(bill.amount)}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(bill.dueDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bill.days > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {bill.days > 0 ? `Due in ${bill.days} days` : `Overdue ${Math.abs(bill.days)} days`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-slate-600">Total Outstanding</span>
          <span className="text-xl font-bold text-red-600">
            {formatCurrency(financialData.outstanding.reduce((sum, b) => sum + b.amount, 0))}
          </span>
        </div>
      </div>

      {/* Daily Collections */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Collections</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Cash</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Card</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">UPI</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Cheque</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {financialData.collections.map((collection, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{formatDate(collection.date)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.cash)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.card)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.upi)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.cheque)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(collection.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Operational Reports Section
  const OperationalReports = () => (
    <div className="space-y-6">
      {/* Doctor Performance */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Doctor Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Doctor</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">OPD Patients</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Revenue</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Rating</th>
              </tr>
            </thead>
            <tbody>
              {operationalData.doctorPerformance.map((doctor, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                        {doctor.name.charAt(4)}
                      </div>
                      <span className="font-medium text-slate-800">{doctor.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">{doctor.opdPatients}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(doctor.revenue)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span className="font-medium text-slate-700">{doctor.avgRating}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Utilization */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Service Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalData.serviceUsage.map((service, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white text-lg">🔬</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-800">{service.service}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500">{service.count} times</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(service.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Comprehensive reports and insights for your hospital</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Date Range:</span>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this-week', label: 'This Week' },
                { value: 'this-month', label: 'This Month' },
                { value: 'this-year', label: 'This Year' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              className="w-40"
            />
          </div>
          {dateRange === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">From:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">To:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Section Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap">
            {[
              { id: 'revenue', label: 'Revenue Reports', icon: '💰' },
              { id: 'patient', label: 'Patient Reports', icon: '👥' },
              { id: 'financial', label: 'Financial Reports', icon: '📊' },
              { id: 'operational', label: 'Operational Reports', icon: '🏥' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as ReportType)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeSection === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {activeSection === 'revenue' && <RevenueReports />}
          {activeSection === 'patient' && <PatientReports />}
          {activeSection === 'financial' && <FinancialReports />}
          {activeSection === 'operational' && <OperationalReports />}
        </div>
      </div>
    </div>
  )
}

export default ReportsDashboard
