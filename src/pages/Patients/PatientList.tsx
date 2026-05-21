import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select } from '../../components/ui'
import { patientAPI } from '../../api/endpoints'
import ConfirmModal from '../../components/modal/ConfirmModal'
import SuccessModal from '../../components/modal/SuccessModal'
import { useAppSelector } from '../../hooks/useRedux'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  phone: string
  aadhar: string
  address: string
  emergencyContact: string
  createdAt: string
  _count?: {
    opdVisits: number
  }
}

const PatientList = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })
  const [successModal, setSuccessModal] = useState({ open: false, message: '' })

  const showSuccess = (msg: string) => setSuccessModal({ open: true, message: msg })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // reset to page 1 on new search
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchPatients()
  }, [page, debouncedSearch])

  // Stats (computed from current page data; total from API)
  const totalPatients = pagination.total
  const newThisMonth = patients.filter(p => {
    const created = new Date(p.createdAt)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length
  const totalOpdVisits = patients.reduce((sum, p) => sum + (p._count?.opdVisits || 0), 0)

  // Filter by gender client-side (gender not supported in API)
  const filteredPatients = patients.filter(patient => {
    const matchesGender = !genderFilter || patient.gender === genderFilter
    return matchesGender
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const maskAadhar = (aadhar: string) => {
    return `XXXX-XXXX-${aadhar.slice(-4)}`
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { page, limit: 20 }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }
      const res = await patientAPI.getAll(params)
      setPatients(res.data.data.patients || [])
      setPagination(res.data.data.pagination)
    } catch (err) {
      console.error('Failed to load patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (patient: Patient) => {
    setConfirmModal({
      open: true,
      title: 'Delete Patient',
      message: `Are you sure you want to delete "${patient.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        await patientAPI.delete(patient.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess('Patient deleted successfully!')
        fetchPatients()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">All Patients</h1>
          <p className="text-slate-500 mt-1">Complete patient registry</p>
        </div>
        <Button onClick={() => navigate('/opd/register')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Register New Patient
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="text-xl font-bold text-slate-800">{totalPatients}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total OPD Visits</p>
              <p className="text-xl font-bold text-emerald-600">{totalOpdVisits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">New This Month</p>
              <p className="text-xl font-bold text-amber-600">{newThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-2">
            <div className="relative">
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, phone, or Aadhar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-2 gap-3">
            <Select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              placeholder="All Gender"
              options={[
                { value: '', label: 'All Gender' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Aadhar</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Registered</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">OPD Visits</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) :
                filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-slate-500">No patients found</p>
                        <Button size="sm" onClick={() => navigate('/opd/register')}>
                          Register New Patient
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{patient.name}</p>
                            <p className="text-xs text-slate-500">
                              {patient.age}y • {patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'O'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{patient.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-500 font-mono">{maskAadhar(patient.aadhar)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{formatDate(patient.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-800">{patient._count?.opdVisits || 0}</p>
                          <p className="text-xs text-slate-400">OPD Visits</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate('/opd/register', { state: { patient } })}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title="New OPD Visit"
                          >
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate('/ipd/admit', { state: { patient } })}
                            className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Admit Patient"
                          >
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(patient)}
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
        {filteredPatients.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> patients
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

      {/* Modals */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />
      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />
    </div>
  )
}

export default PatientList
