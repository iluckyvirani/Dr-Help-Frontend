import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Input, Select, Button } from '../../components/ui'
import { opdAPI, doctorAPI, reportAPI } from '../../api/endpoints'
import ConfirmModal from '../../components/modal/ConfirmModal'
import SuccessModal from '../../components/modal/SuccessModal'
import { useAppSelector } from '../../hooks/useRedux'

interface OPDRecord {
  id: string
  patientId: string
  doctorId: string
  tokenNumber: number
  visitDate: string
  symptoms: string | null
  diagnosis: string | null
  fee: string
  paymentStatus: string
  paymentMode: string
  status?: string
  createdAt: string
  updatedAt: string
  patient: {
    id: string
    name: string
    phone: string
    age: number
    gender: string
  }
  doctor: {
    id: string
    name: string
    specialization: string
  }
}

interface EditForm {
  symptoms: string
  fee: number
  paymentMode: string
  paymentStatus: string
  doctorId: string
}

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'CHEQUE', 'ONLINE', 'BANK_TRANSFER']
const PAYMENT_STATUSES = ['PAID', 'PENDING']

const OPDHistoryPage = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [records, setRecords] = useState<OPDRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<OPDRecord | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })

  // ── Edit / Delete state ───────────────────────────────────
  const [editingPatient, setEditingPatient] = useState<OPDRecord | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ symptoms: '', fee: 0, paymentMode: '', paymentStatus: '', doctorId: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string; fee: number }[]>([])
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })
  const [successModal, setSuccessModal] = useState({ open: false, message: '' })

  const showSuccess = (msg: string) => setSuccessModal({ open: true, message: msg })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { page, limit: 20 }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      if (paymentFilter) params.paymentStatus = paymentFilter
      const res = await opdAPI.getAllVisits(params)
      setRecords(res.data.data.visits || [])
      if (res.data.data.pagination) setPagination(res.data.data.pagination)
    } catch (err) {
      console.error('Failed to load OPD history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [page, debouncedSearch, fromDate, toDate, paymentFilter])

  // ── Fetch doctors for edit dropdown ──────────────────────
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorAPI.getAll()
        setDoctors((res.data.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          specialty: d.specialization,
          fee: Number(d.consultationFee) || 0,
        })))
      } catch (err) {
        console.error('Failed to load doctors:', err)
      }
    }
    fetchDoctors()
  }, [])

  const openEdit = (record: OPDRecord) => {
    setEditingPatient(record)
    setEditError('')
    setEditForm({
      symptoms: record.symptoms || '',
      fee: record.fee ? parseFloat(record.fee) : 0,
      paymentMode: record.paymentMode || '',
      paymentStatus: record.paymentStatus || '',
      doctorId: record.doctorId || '',
    })
  }

  // Auto-fill consultation fee when doctor is selected
  useEffect(() => {
    if (editForm?.doctorId) {
      const selectedDoctor = doctors.find(d => String(d.id) === String(editForm.doctorId))
      if (selectedDoctor) {
        setEditForm(prev => ({ ...prev, fee: selectedDoctor.fee }))
      }
    }
  }, [editForm?.doctorId, doctors])

  const handleEditSave = async () => {
    if (!editingPatient) return
    setEditLoading(true)
    setEditError('')
    try {
      await opdAPI.update(editingPatient.id, {
        symptoms: editForm.symptoms || undefined,
        fee: editForm.fee ? Number(editForm.fee) : undefined,
        paymentMode: editForm.paymentMode || undefined,
        paymentStatus: editForm.paymentStatus || undefined,
        doctorId: editForm.doctorId || undefined,
      })
      setEditingPatient(null)
      showSuccess('OPD visit updated successfully!')
      fetchHistory()
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Failed to update OPD visit')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (record: OPDRecord) => {
    setConfirmModal({
      open: true,
      title: 'Delete OPD Visit',
      message: `Are you sure you want to delete "${record.patient.name}" OPD visit (Token #${record.tokenNumber})? This action cannot be undone.`,
      onConfirm: async () => {
        await opdAPI.delete(record.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess('OPD visit deleted successfully!')
        fetchHistory()
      }
    })
  }

  const isFilterActive = fromDate || toDate || paymentModeFilter || doctorFilter || paymentFilter || sortBy !== 'date-desc'

  // Get unique doctors for filter
  const uniqueDoctors = Array.from(new Set(records.map(h => h.doctor?.name).filter(Boolean)))

  // Client-side filtering for fields not supported by API (status, doctor, sort)
  let filteredHistory = records.filter((entry) => {
    const matchesPaymentMode = !paymentModeFilter || entry.paymentMode === paymentModeFilter
    const matchesDoctor = !doctorFilter || entry.doctor?.name === doctorFilter
    return matchesPaymentMode && matchesDoctor
  })

  // Sort results
  filteredHistory = [...filteredHistory].sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
      case 'date-desc':
        return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      case 'patient-name':
        return (a.patient?.name || '').localeCompare(b.patient?.name || '')
      case 'doctor-name':
        return (a.doctor?.name || '').localeCompare(b.doctor?.name || '')
      default:
        return 0
    }
  })



  const getPaymentBadge = (status: string) => {
    return status?.toUpperCase() === 'PAID' ? <Badge variant="success">Paid</Badge> : <Badge variant="danger">Pending</Badge>
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">OPD History</h1>
        <p className="text-slate-500 mt-1">View all OPD visit records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Records</p>
              <p className="text-xl font-bold text-slate-800">{pagination.total}</p>
            </div>
          </div>
        </div>
        {/* <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Cash</p>
              <p className="text-xl font-bold text-emerald-600">
                {records.filter(p => p.paymentMode?.toUpperCase() === 'CASH').length || 0}
              </p>
            </div>
          </div>
        </div> */}
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-xl font-bold text-green-600">
                {records.filter(p => p.paymentStatus?.toUpperCase() === 'PAID').length}
              </p>
            </div>
          </div>
        </div>
        {/* <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Payment</p>
              <p className="text-xl font-bold text-emerald-600">
                {records.filter(p => p.paymentStatus?.toUpperCase() !== 'PAID').length}
              </p>
            </div>
          </div>
        </div> */}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, token, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowAdvancedFilters(true)}
            variant={isFilterActive ? 'primary' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {isFilterActive && <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>}
          </Button>
          <Button
            variant="outline"
            disabled={pdfLoading}
            className="whitespace-nowrap"
            onClick={async () => {
              try {
                setPdfLoading(true)
                const params: Record<string, any> = {}
                if (fromDate) params.from = fromDate
                if (toDate) params.to = toDate
                if (paymentFilter) params.paymentStatus = paymentFilter
                if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                const res = await reportAPI.exportOpdPdf(params)
                const blob = new Blob([res.data], { type: 'application/pdf' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `OPD_Report_${fromDate || 'all'}_${toDate || 'all'}.pdf`
                a.click()
                window.URL.revokeObjectURL(url)
              } catch (err: any) {
                const msg = err?.response?.data?.message || err?.response?.statusText || 'Failed to generate PDF'
                alert(typeof msg === 'string' ? msg : 'No records found for the given filters')
              } finally {
                setPdfLoading(false)
              }
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Advanced Filters</h3>
                <p className="text-sm text-slate-500 mt-1">Refine your search results</p>
              </div>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    label="From Date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    label="To Date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <Select
                  label="Payment Mode"
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Payment Modes' },
                    { value: 'CASH', label: 'Cash' },
                    { value: 'CARD', label: 'Card' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'ONLINE', label: 'Online' },
                  ]}
                />
              </div>

              {/* Doctor Filter */}
              <div>
                <Select
                  label="Doctor"
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Doctors' },
                    ...uniqueDoctors.map(doctor => ({ value: doctor, label: doctor }))
                  ]}
                />
              </div>

              {/* Payment Status Filter */}
              <div>
                <Select
                  label="Payment Status"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Payment' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />
              </div>

              {/* Sort By */}
              <div>
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { value: 'date-desc', label: 'Latest First' },
                    { value: 'date-asc', label: 'Oldest First' },
                    { value: 'patient-name', label: 'Patient Name (A-Z)' },
                    { value: 'doctor-name', label: 'Doctor Name (A-Z)' },
                  ]}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 shrink-0">
              <Button
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                  setPaymentModeFilter('')
                  setDoctorFilter('')
                  setPaymentFilter('')
                  setSortBy('date-desc')
                }}
                variant="outline"
                className="cursor-pointer"
              >
                Reset
              </Button>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                className="cursor-pointer"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {isFilterActive && (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-blue-700">Active Filters:</span>
            {fromDate && <Badge variant="info">{fromDate}</Badge>}
            {toDate && <Badge variant="info">{toDate}</Badge>}
            {paymentModeFilter && <Badge variant="info">Payment Mode: {paymentModeFilter}</Badge>}
            {doctorFilter && <Badge variant="info">{doctorFilter}</Badge>}
            {paymentFilter && <Badge variant="info">Payment: {paymentFilter}</Badge>}
            {sortBy !== 'date-desc' && <Badge variant="info">Sort: {sortBy}</Badge>}
          </div>
          <button
            onClick={() => {
              setFromDate('')
              setToDate('')
              setPaymentModeFilter('')
              setDoctorFilter('')
              setPaymentFilter('')
              setSortBy('date-desc')
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Token</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Specialty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-slate-500">No records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {entry.tokenNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{entry.patient?.name}</p>
                        <p className="text-xs text-slate-500">
                          {entry.patient?.age}y • {entry.patient?.gender === 'MALE' ? 'M' : 'F'} • {entry.patient?.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{entry.doctor?.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">{entry.doctor?.specialization}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{new Date(entry.visitDate).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentBadge(entry.paymentStatus || '')}
                    </td>
                    <td className="font-medium text-slate-800">
                      {entry.paymentMode || ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{formatTime(entry.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(`/opd/slip/${entry.id}`)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Print Slip"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate('/ipd/admit', { state: { patient: entry.patient } })}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Admit Patient"
                        >
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(`/prescriptions/add?patientId=${entry.patient.id}&opdVisitId=${entry.id}`, { state: { patientId: entry.patient.id, opdVisitId: entry.id, patientName: entry.patient.name } })}
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          title="Add Prescription"
                        >
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => openEdit(entry)}
                            className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit OPD Visit"
                          >
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(entry)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredHistory.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
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

      {/* Patient Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Patient Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Token & Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500">Token Number</p>
                  <p className="font-mono font-bold text-blue-600">{selectedEntry.tokenNumber}</p>
                </div>
                <div className="flex gap-2">
                  {getPaymentBadge(selectedEntry.paymentStatus)}
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Patient Name</p>
                  <p className="font-medium text-slate-800">{selectedEntry.patient?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Age / Gender</p>
                  <p className="font-medium text-slate-800">
                    {selectedEntry.patient?.age} years / {selectedEntry.patient?.gender === 'MALE' ? 'Male' : 'Female'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium text-slate-800">{selectedEntry.patient?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Payment Mode</p>
                  <p className="font-medium text-slate-800">{selectedEntry.paymentMode || 'N/A'}</p>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">Consulting Doctor</p>
                <p className="font-medium text-slate-800">{selectedEntry.doctor?.name}</p>
                <p className="text-sm text-slate-600">{selectedEntry.doctor?.specialization}</p>
              </div>

              {/* Symptoms */}
              {selectedEntry.symptoms && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Symptoms</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedEntry.symptoms}</p>
                </div>
              )}

              {/* Diagnosis */}
              {selectedEntry.diagnosis && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Diagnosis</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedEntry.diagnosis}</p>
                </div>
              )}

              {/* Fee & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Consultation Fee</p>
                  <p className="text-xl font-bold text-emerald-600">₹{selectedEntry.fee}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Visit Date</p>
                  <p className="font-medium text-slate-800">
                    {new Date(selectedEntry.visitDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  navigate(`/opd/slip/${selectedEntry.id}`)
                  setSelectedEntry(null)
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit OPD Visit Modal */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Edit OPD Visit</h3>
                <p className="text-xs text-slate-500">Token #{editingPatient.tokenNumber} — {editingPatient.patient?.name}</p>
              </div>
              <button onClick={() => setEditingPatient(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{editError}</div>
              )}

              <div>
                <Select
                  label="Select Doctor"
                  name="doctorId"
                  value={editForm.doctorId}
                  onChange={(e) => setEditForm(f => ({ ...f, doctorId: e.target.value }))}
                  placeholder="Choose a doctor"
                  required
                  options={doctors.map(d => ({
                    value: d.id,
                    label: `${d.name} (${d.specialty})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Consultation Fee (₹)</label>
                <input
                  type="number"
                  value={editForm.fee}
                  onChange={(e) => setEditForm(f => ({ ...f, fee: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={editForm.paymentMode}
                  onChange={(e) => setEditForm(f => ({ ...f, paymentMode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                >
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Status</label>
                <select
                  value={editForm.paymentStatus}
                  onChange={(e) => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
                >
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Symptoms / Diagnosis</label>
                <textarea
                  rows={2}
                  value={editForm.symptoms}
                  onChange={(e) => setEditForm(f => ({ ...f, symptoms: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                  placeholder="Patient symptoms..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingPatient(null)} disabled={editLoading}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        title="Success"
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />
    </div>
  )
}

export default OPDHistoryPage
