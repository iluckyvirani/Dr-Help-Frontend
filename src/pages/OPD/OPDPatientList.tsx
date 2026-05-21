import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Select, Button, Badge } from '../../components/ui'
import { doctorAPI, opdAPI } from '../../api/endpoints'
import ConfirmModal from '../../components/modal/ConfirmModal'
import SuccessModal from '../../components/modal/SuccessModal'
import { useAppSelector } from '../../hooks/useRedux'

interface OPDPatient {
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
  check: boolean
  patient: {
    id: string
    name: string
    phone: string
    age: number
    gender: string
    aadhar?: string
  }
  doctor: {
    id: string
    name: string
    specialization: string
  }
}

// ── Edit form shape ───────────────────────────────────────
interface EditForm {
  symptoms: string
  fee: number
  paymentMode: string
  paymentStatus: string
  doctorId: string
}

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'CHEQUE', 'ONLINE', 'BANK_TRANSFER']
const PAYMENT_STATUSES = ['PAID', 'PENDING']

const OPDPatientList = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [patients, setPatients] = useState<OPDPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })
  const [selectedPatient, setSelectedPatient] = useState<OPDPatient | null>(null)

  const [editingPatient, setEditingPatient] = useState<OPDPatient | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ symptoms: '', fee: 0, paymentMode: '', paymentStatus: '', doctorId: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string; fee: number }[]>([])

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })
  const [successModal, setSuccessModal] = useState({ open: false, message: '' })

  const [checkingId, setCheckingId] = useState<string | null>(null)



  const showSuccess = (msg: string) => setSuccessModal({ open: true, message: msg })





  const fetchOPD = async () => {
    try {
      setLoading(true)
      const res = await opdAPI.getTodayVisits()
      setPatients(res.data.data || [])
    } catch (err) {
      console.error('Failed to load OPD patients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOPD()
  }, [])

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const name = (patient.patient?.name || '').toLowerCase()
    const token = String(patient.tokenNumber || '')
    const phone = patient.patient?.phone || ''
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      token.includes(searchTerm) ||
      phone.includes(searchTerm)

    const matchesPaymentMode = !paymentModeFilter || patient.paymentMode === paymentModeFilter
    const matchesDate = !dateFilter || patient.visitDate.startsWith(dateFilter)

    return matchesSearch && matchesPaymentMode && matchesDate
  })

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { variant: 'success' | 'warning' | 'info' | 'default'; label: string }> = {
      waiting: { variant: 'warning', label: 'Waiting' },
      'in-consultation': { variant: 'info', label: 'In Consultation' },
      completed: { variant: 'success', label: 'Completed' },
    }
    const config = statusConfig[status || ''] || { variant: 'default', label: status || 'N/A' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPaymentBadge = (status: string) => {
    return status?.toUpperCase() === 'PAID'
      ? <Badge variant="success">Paid</Badge>
      : <Badge variant="danger">Pending</Badge>
  }

  const getCheckBadge = (checked?: boolean) => {
    if (checked) {
      return <Badge variant="success">Checked</Badge>
    }
    return <Badge variant="warning">Waiting</Badge>
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [doctorsRes] = await Promise.all([
          doctorAPI.getAll(),
        ])
        setDoctors((doctorsRes.data.data || []).map((d: any) => ({
          id: d.id, // ✅ ADD THIS
          name: d.name,
          specialty: d.specialization,
          fee: Number(d.consultationFee) || 0,
        })))
      } catch (err) {
        console.error('Failed to load initial data:', err)
      }
    }
    fetchInitial()
  }, [])

  const openEdit = (patient: OPDPatient) => {
    setEditingPatient(patient)
    setEditError('')
    setEditForm({
      symptoms: patient.symptoms || '',
      fee: patient.fee ? parseFloat(patient.fee) : 0,
      paymentMode: patient.paymentMode || '',
      paymentStatus: patient.paymentStatus || '',
      doctorId: patient.doctorId || '',
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
      fetchOPD() // refresh list so changes reflect everywhere
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Failed to update OPD visit')
    } finally {
      setEditLoading(false)
    }
  }


  const handleCheckToggle = async (id: string, currentValue: boolean) => {
    setCheckingId(id)

    try {
      await opdAPI.updateCheck(id, !currentValue)

      // ✅ instant UI update (no reload)
      setPatients(prev =>
        prev.map(p =>
          p.id === id ? { ...p, check: !currentValue } : p
        )
      )
      showSuccess('OPD check status updated successfully!')
    } catch (err) {
      console.error(err)
    } finally {
      setCheckingId(null)
    }
  }





  const handleDelete = (OPD: OPDPatient) => {
    setConfirmModal({
      open: true,
      title: 'Delete OPD',
      message: `Are you sure you want to delete "${OPD.patient.name}" OPD? This action cannot be undone.`,
      onConfirm: async () => {
        await opdAPI.delete(OPD.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess('OPD deleted successfully!')
        fetchOPD()
      }
    })
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OPD Patients</h1>
          <p className="text-slate-500 mt-1">Manage outpatient registrations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/opd/history')} variant="outline" className="cursor-pointer">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            OPD History
          </Button>
          <Button onClick={() => navigate('/opd/register')} className='cursor-pointer'>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Registration
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Today</p>
              <p className="text-xl font-bold text-slate-800">
                {filteredPatients.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-xl font-bold text-amber-600">
                ₹{filteredPatients.filter(p => p.paymentStatus?.toUpperCase() === 'PAID').reduce((sum, p) => sum + parseFloat(p.fee || '0'), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Cash Amount</p>
              <p className="text-xl font-bold text-emerald-600">
                ₹{filteredPatients.filter(p => p.paymentMode === 'CASH' && p.paymentStatus?.toUpperCase() === 'PAID').reduce((sum, p) => sum + parseFloat(p.fee || '0'), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Online Amount</p>
              <p className="text-xl font-bold text-indigo-600">
                ₹{filteredPatients.filter(p => ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CARD'].includes(p.paymentMode) && p.paymentStatus?.toUpperCase() === 'PAID').reduce((sum, p) => sum + parseFloat(p.fee || '0'), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Checked</p>
              <p className="text-xl font-bold text-cyan-600">
                {filteredPatients.filter(p => p.check).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Waiting</p>
              <p className="text-xl font-bold text-violet-600">
                {filteredPatients.filter(p => !p.check).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-xl font-bold text-red-600">
                ₹{filteredPatients.filter(p => p.paymentStatus?.toUpperCase() === 'PENDING').reduce((sum, p) => sum + parseFloat(p.fee || '0'), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
            <Select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              placeholder="All Payment Modes"
              options={[
                { value: '', label: 'All Payment Modes' },
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'UPI', label: 'UPI' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'ONLINE', label: 'Online' },
              ]}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Token</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
              ) : (
                filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {patient.tokenNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{patient.patient?.name}</p>
                          <p className="text-xs text-slate-500">
                            {patient.patient?.age}y • {patient.patient?.gender === 'MALE' ? 'M' : 'F'} • {patient.patient?.phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{patient.doctor?.name}</p>
                          <p className="text-xs text-slate-500">{patient.doctor?.specialization}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">₹{patient.fee}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getPaymentBadge(patient.paymentStatus)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(patient.paymentMode)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{formatTime(patient.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {checkingId === patient.id ? (
                          // 🔄 Loading animation
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          // ✅ Badge (visible to all, clickable only for super admin)
                          <div
                            className={`${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                              }`}
                            onClick={() => {
                              if (isSuperAdmin) {
                                handleCheckToggle(patient.id, patient.check);
                              }
                            }}
                          >
                            {getCheckBadge(patient.check)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/opd/slip/${patient.id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Print Slip"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate('/ipd/admit', { state: { patient: patient.patient } })}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Admit Patient"
                          >
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/prescriptions/add?patientId=${patient.patient.id}&opdVisitId=${patient.id}`, { state: { patientId: patient.patient.id, opdVisitId: patient.id, patientName: patient.patient.name } })}
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                            title="Add Prescription"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => openEdit(patient)}
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
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPatients.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium">{filteredPatients.length}</span> patients
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Patient Details</h3>
              <button
                onClick={() => setSelectedPatient(null)}
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
                  <p className="font-mono font-bold text-blue-600">{selectedPatient.tokenNumber}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedPatient.status)}
                  {getPaymentBadge(selectedPatient.paymentStatus)}
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Patient Name</p>
                  <p className="font-medium text-slate-800">{selectedPatient.patient?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Age / Gender</p>
                  <p className="font-medium text-slate-800">
                    {selectedPatient.patient?.age} years / {selectedPatient.patient?.gender === 'MALE' ? 'Male' : 'Female'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium text-slate-800">{selectedPatient.patient?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Aadhar</p>
                  <p className="font-medium text-slate-800">
                    XXXX-XXXX-{selectedPatient.patient?.aadhar?.slice(-4) || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">Consulting Doctor</p>
                <p className="font-medium text-slate-800">{selectedPatient.doctor?.name}</p>
                <p className="text-sm text-slate-600">{selectedPatient.doctor?.specialization}</p>
              </div>

              {/* Symptoms */}
              {selectedPatient.symptoms && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Symptoms / Diagnosis</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedPatient.symptoms}</p>
                </div>
              )}

              {/* Fee & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Consultation Fee</p>
                  <p className="text-xl font-bold text-emerald-600">₹{selectedPatient.fee}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Visit Date</p>
                  <p className="font-medium text-slate-800">
                    {new Date(selectedPatient.visitDate).toLocaleDateString('en-IN', {
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
              <Button variant="outline" className="flex-1" onClick={() => setSelectedPatient(null)}>
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  navigate(`/opd/slip/${selectedPatient.id}`)
                  setSelectedPatient(null)
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Consultation Fee (₹)</label>
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

              {/* Fee */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Consultation Fee (₹)</label>
                <input
                  type="number"
                  value={editForm.fee}
                  onChange={(e) =>
                    setEditForm(f => ({
                      ...f,
                      fee: Number(e.target.value)
                    }))
                  } className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  placeholder="e.g. 500"
                />
              </div>

              {/* Payment Mode */}
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

              {/* Payment Status */}
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

              {/* Symptoms */}
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

export default OPDPatientList
