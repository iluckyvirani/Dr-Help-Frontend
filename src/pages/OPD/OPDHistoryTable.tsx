import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { opdAPI } from '../../api/endpoints'

interface OPDRecord {
  id: number
  tokenNumber: string
  patientName: string
  doctorName: string
  specialty: string
  visitDate: string
  paymentStatus: string
  status: string
  createdAt: string
}

const OPDHistoryTable = () => {
  const [records, setRecords] = useState<OPDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const params: Record<string, any> = { page, limit: 20 }
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
        if (date) params.date = date
        if (status) params.status = status
        const res = await opdAPI.getAllVisits(params)
        const data = res.data.data
        setRecords(data.visits || data || [])
        if (data.pagination) setPagination(data.pagination)
      } catch (err) {
        console.error('Failed to fetch OPD history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [page, debouncedSearch, date, status])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  // Export handler (CSV)
  const handleExport = () => {
    const csv = [
      'Token,Patient,Doctor,Specialty,Visit Date,Payment,Status',
      ...records.map(row =>
        [row.tokenNumber, row.patientName, row.doctorName, row.specialty, row.visitDate, row.paymentStatus, row.status].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'opd-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex-1">
          <Input
            placeholder="Search by patient or token..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <Select
          value={status}
          onChange={e => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
          ]}
          className="w-40"
        />
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-40"
        />
        <Button onClick={handleExport} variant="outline">Export</Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Token</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Patient</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Doctor</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Specialty</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Visit Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Payment</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">No history found</td>
              </tr>
            ) : (
              records.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600">{row.tokenNumber.slice(-6)}</td>
                  <td className="px-4 py-3">{row.patientName}</td>
                  <td className="px-4 py-3">{row.doctorName}</td>
                  <td className="px-4 py-3">{row.specialty}</td>
                  <td className="px-4 py-3">{row.visitDate}</td>
                  <td className="px-4 py-3 capitalize">{row.paymentStatus}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OPDHistoryTable
