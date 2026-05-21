import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Badge, Input, Select } from '../../components/ui'
import { patientAPI, billingAPI, serviceAPI, prescriptionAPI } from '../../api/endpoints'
import { printBillDocument } from '../../utils/printBill'
import { ConfirmModal, SuccessModal } from '../../components/modal'
import { useAppSelector } from '../../hooks/useRedux'

type TabType = 'profile' | 'reports' | 'prescriptions' | 'services' | 'payments' | 'bills'

const PatientDetail = () => {
  const navigate = useNavigate()
  const { id: patientId } = useParams()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingReport, setUploadingReport] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportType, setReportType] = useState('Lab Report')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null)
  const [showGenerateBillModal, setShowGenerateBillModal] = useState(false)
  const [generatingBill, setGeneratingBill] = useState(false)
  const [showPrintBill, setShowPrintBill] = useState<any>(null)
  const [billPaymentMode, setBillPaymentMode] = useState('CASH')
  const [billNotes, setBillNotes] = useState('')
  const [billOtherCharges, setBillOtherCharges] = useState(0)
  const [loading, setLoading] = useState(true)

  // Assign Service modal state
  const [showAssignServiceModal, setShowAssignServiceModal] = useState(false)
  const [allServices, setAllServices] = useState<any[]>([])
  const [selectedServices, setSelectedServices] = useState<{ id: string; name: string; fee: number; quantity: number }[]>([])
  const [assigningServices, setAssigningServices] = useState(false)
  const [serviceNotes, setServiceNotes] = useState('')

  // Edit patient modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '', age: '', gender: '', phone: '', aadhar: '',
    address: '', emergencyContact: '', emergencyName: '',
    email: '', bloodGroup: '', allergies: '',
  })
  const [updatingPatient, setUpdatingPatient] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Confirm & success modal state
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })
  const [successMsg, setSuccessMsg] = useState({ open: false, message: '' })
  const showSuccessMsg = (msg: string) => setSuccessMsg({ open: true, message: msg })

  // Prescription edit state
  const [editingPrescription, setEditingPrescription] = useState<any>(null)
  const [editPrescriptionForm, setEditPrescriptionForm] = useState<{
    notes: string;
    medicines: { medicineName: string; dosage: string; form: string; quantity: string; frequency: string; days: string; instructions: string }[];
  }>({ notes: '', medicines: [] })
  const [editPrescriptionLoading, setEditPrescriptionLoading] = useState(false)

  // Service edit/delete state
  const [editingService, setEditingService] = useState<any>(null)
  const [editServiceForm, setEditServiceForm] = useState({ serviceId: '', quantity: '1', serviceDate: '', notes: '' })
  const [editServiceLoading, setEditServiceLoading] = useState(false)

  // Deposit edit/delete state
  const [editingDeposit, setEditingDeposit] = useState<{ id: string; amount: string; paymentMode: string; notes: string } | null>(null)
  const [editDepositLoading, setEditDepositLoading] = useState(false)

  const [patient, setPatient] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [prescriptionHistory, setPrescriptionHistory] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [opdPayments, setOpdPayments] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [finalBills, setFinalBills] = useState<any[]>([])

  const fetchAllData = async () => {
    if (!patientId) return
    try {
      const [patientRes, reportsRes, prescRes, servicesRes, paymentsRes] = await Promise.all([
        patientAPI.getById(patientId),
        patientAPI.getReports(patientId),
        patientAPI.getMedicineHistory(patientId),
        patientAPI.getServiceHistory(patientId),
        patientAPI.getPaymentHistory(patientId),
      ])
      setPatient(patientRes.data.data)
      setReports(reportsRes.data.data || [])
      setPrescriptionHistory(prescRes.data.data || [])
      setServices(servicesRes.data.data || [])
      const paymentData = paymentsRes.data.data || {}
      setOpdPayments(paymentData.opdPayments || [])
      setDeposits(paymentData.deposits || [])
      setFinalBills(paymentData.finalBills || [])
    } catch (err) {
      console.error('Failed to fetch patient data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [patientId])

  // Deposit edit/delete handlers
  const handleEditDepositSave = async () => {
    if (!editingDeposit) return
    setEditDepositLoading(true)
    try {
      await billingAPI.update(editingDeposit.id, {
        amount: Number(editingDeposit.amount),
        paymentMode: editingDeposit.paymentMode,
        notes: editingDeposit.notes || undefined,
      })
      setEditingDeposit(null)
      showSuccessMsg('Deposit updated successfully!')
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update deposit')
    } finally {
      setEditDepositLoading(false)
    }
  }

  // Prescription edit/delete handlers
  const openEditPrescription = (record: any) => {
    setEditingPrescription(record)
    setEditPrescriptionForm({
      notes: record.notes || '',
      medicines: (record.medicines || []).map((m: any) => ({
        medicineName: m.medicineName || '',
        dosage: m.dosage || '',
        form: m.form || 'Tablet',
        quantity: String(m.quantity || ''),
        frequency: m.frequency || '',
        days: String(m.days || ''),
        instructions: m.instructions || '',
      })),
    })
  }

  const handleEditPrescriptionSave = async () => {
    if (!editingPrescription) return
    setEditPrescriptionLoading(true)
    try {
      await prescriptionAPI.update(editingPrescription.id, {
        notes: editPrescriptionForm.notes || undefined,
        medicines: editPrescriptionForm.medicines.map(m => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          form: m.form,
          quantity: m.quantity,
          frequency: m.frequency,
          days: m.days,
          instructions: m.instructions || undefined,
        })),
      })
      setEditingPrescription(null)
      showSuccessMsg('Prescription updated successfully!')
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update prescription')
    } finally {
      setEditPrescriptionLoading(false)
    }
  }

  const handleDeletePrescription = (record: any) => {
    setConfirmModal({
      open: true,
      title: 'Delete Prescription',
      message: `Are you sure you want to delete this prescription from ${formatDate(record.prescriptionDate)}? This action cannot be undone.`,
      onConfirm: async () => {
        await prescriptionAPI.delete(record.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccessMsg('Prescription deleted successfully!')
        fetchAllData()
      }
    })
  }

  const addMedicineRow = () => {
    setEditPrescriptionForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { medicineName: '', dosage: '', form: 'Tablet', quantity: '', frequency: '', days: '', instructions: '' }],
    }))
  }

  const removeMedicineRow = (idx: number) => {
    setEditPrescriptionForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== idx),
    }))
  }

  const updateMedicineRow = (idx: number, field: string, value: string) => {
    setEditPrescriptionForm(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }))
  }

  // Service edit/delete handlers
  const openEditService = (svc: any) => {
    setEditingService(svc)
    setEditServiceForm({
      serviceId: svc.serviceId || svc.service?.id || '',
      quantity: String(svc.quantity || 1),
      serviceDate: svc.serviceDate ? new Date(svc.serviceDate).toISOString().slice(0, 10) : '',
      notes: svc.notes || '',
    })
  }

  const handleEditServiceSave = async () => {
    if (!editingService) return
    setEditServiceLoading(true)
    try {
      await serviceAPI.updateAssigned(editingService.id, {
        serviceId: editServiceForm.serviceId,
        quantity: Number(editServiceForm.quantity),
        serviceDate: editServiceForm.serviceDate || undefined,
        notes: editServiceForm.notes || undefined,
      })
      setEditingService(null)
      showSuccessMsg('Service updated successfully!')
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update service')
    } finally {
      setEditServiceLoading(false)
    }
  }

  const handleDeleteService = (svc: any) => {
    setConfirmModal({
      open: true,
      title: 'Delete Assigned Service',
      message: `Are you sure you want to delete "${svc.service?.name || 'this service'}"? This action cannot be undone.`,
      onConfirm: async () => {
        await serviceAPI.deleteAssigned(svc.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccessMsg('Service deleted successfully!')
        fetchAllData()
      }
    })
  }

  const handleDeleteDeposit = (dep: any) => {
    setConfirmModal({
      open: true,
      title: 'Delete Deposit',
      message: `Are you sure you want to delete this deposit of ₹${Number(dep.amount).toLocaleString()}? This action cannot be undone.`,
      onConfirm: async () => {
        await billingAPI.delete(dep.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccessMsg('Deposit deleted successfully!')
        fetchAllData()
      }
    })
  }

  const handleUploadReport = async () => {
    if (!patientId || !reportName || !reportFile) return alert('Please fill report name and select a file')
    setUploadingReport(true)
    try {
      const fd = new FormData()
      fd.append('reportName', reportName)
      fd.append('reportType', reportType)
      fd.append('file', reportFile)
      await patientAPI.uploadReport(patientId, fd)
      setShowUploadModal(false)
      setReportName('')
      setReportType('Lab Report')
      setReportFile(null)
      fetchAllData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload report')
    } finally {
      setUploadingReport(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!patientId || !deleteReportId) return
    try {
      await patientAPI.deleteReport(patientId, deleteReportId)
      setDeleteReportId(null)
      fetchAllData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete report')
    }
  }

  // Edit patient handlers
  const handleOpenEditModal = () => {
    setEditForm({
      name: patient.name || '',
      age: String(patient.age || ''),
      gender: patient.gender || '',
      phone: patient.phone || '',
      aadhar: patient.aadhar || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      emergencyName: patient.emergencyName || '',
      email: patient.email || '',
      bloodGroup: patient.bloodGroup || '',
      allergies: patient.allergies || '',
    })
    setShowEditModal(true)
  }

  const handleUpdatePatient = async () => {
    if (!patientId) return
    setUpdatingPatient(true)
    try {
      await patientAPI.update(patientId, {
        name: editForm.name,
        age: editForm.age,
        gender: editForm.gender,
        phone: editForm.phone,
        aadhar: editForm.aadhar,
        address: editForm.address,
        emergencyContact: editForm.emergencyContact,
        emergencyName: editForm.emergencyName,
        email: editForm.email,
        bloodGroup: editForm.bloodGroup,
        allergies: editForm.allergies,
      })
      setShowEditModal(false)
      setShowSuccessModal(true)
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update patient')
    } finally {
      setUpdatingPatient(false)
    }
  }

  // Get current active admission (not discharged)
  // const currentAdmission = admitHistory.find(a => a.status === 'ADMITTED')
  // const hasCurrentBill = currentAdmission && finalBills.some(b => b.admissionId === currentAdmission.id)

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'reports', label: 'Reports', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> },
    { id: 'services', label: 'Services', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
    { id: 'payments', label: 'Payments', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'bills', label: 'Final Bills', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg> },
  ]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const maskAadhar = (aadhar: string) => {
    return `${aadhar.slice(0, 4)}-${aadhar.slice(4, 8)}-${aadhar.slice(8)}`
  }

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase()
    if (s === 'PAID') return 'bg-emerald-100 text-emerald-700'
    if (s === 'PENDING') return 'bg-red-100 text-red-700'
    if (s === 'PARTIAL') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-700'
  }

  // Admit history helpers
  const getAdmitDays = (admit: any) => {
    const start = new Date(admit.admissionDate)
    const end = admit.actualDischarge ? new Date(admit.actualDischarge) : new Date()
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }

  // Handle assign service
  const handleOpenAssignService = async () => {
    try {
      const res = await serviceAPI.getAll()
      const data = res.data.data
      setAllServices(Array.isArray(data) ? data : data?.services || [])
    } catch { /* ignore */ }
    setSelectedServices([])
    setServiceNotes('')
    setShowAssignServiceModal(true)
  }

  const handleAddServiceToList = (svc: any) => {
    if (selectedServices.find(s => s.id === svc.id)) return
    setSelectedServices([...selectedServices, { id: svc.id, name: svc.name, fee: Number(svc.fee), quantity: 1 }])
  }

  const handleRemoveServiceFromList = (id: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== id))
  }

  const handleServiceQuantityChange = (id: string, qty: number) => {
    setSelectedServices(selectedServices.map(s => s.id === id ? { ...s, quantity: Math.max(1, qty) } : s))
  }

  const handleAssignServices = async () => {
    if (!patientId || selectedServices.length === 0) return
    setAssigningServices(true)
    try {
      await serviceAPI.assign({
        patientId,
        services: selectedServices.map(s => ({ id: s.id, fee: s.fee, quantity: s.quantity })),
        notes: serviceNotes || undefined,
      })
      setShowAssignServiceModal(false)
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to assign services')
    } finally {
      setAssigningServices(false)
    }
  }

  // Handle generate bill
  const handleGenerateBill = async () => {
    if (!patientId) return
    setGeneratingBill(true)
    try {
      const res = await billingAPI.generateBill({
        patientId,
        otherCharges: billOtherCharges || 0,
        paymentMode: billPaymentMode,
        notes: billNotes || undefined,
      })
      setShowGenerateBillModal(false)
      setShowPrintBill(res.data.data)
      fetchAllData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate bill')
    } finally {
      setGeneratingBill(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
  }

  if (!patient) {
    return <div className="text-center py-20 text-slate-500">Patient not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Patient Details</h1>
          <p className="text-slate-500">{patient.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenAssignService}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Assign Service
          </Button>
          <Button variant="outline" onClick={() => navigate(`/prescriptions/add?patientId=${patientId}`)}>

            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Add Prescription
          </Button>
          <Button variant="outline" onClick={() => navigate('/opd/register')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New OPD
          </Button>

        </div>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
            {patient.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
              <Badge variant={patient.status === 'ADMITTED' ? 'info' : 'success'}>
                {patient.status === 'ADMITTED' ? 'Currently Admitted' : 'Active'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>{patient.age} years • {patient.gender}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {patient.phone}
              </span>
              <span>•</span>
              <span className="font-mono">{maskAadhar(patient.aadhar)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button
                onClick={handleOpenEditModal}
                className="p-2.5 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-300 group"
                title="Edit Patient"
              >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <div className="flex gap-6 text-center">
              <div className="px-4 py-2 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{patient?._count?.opdVisits}</p>
                <p className="text-xs text-blue-600">OPD Visits</p>
              </div>
              <div className="px-4 py-2 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{patient?._count?.admissions}</p>
                <p className="text-xs text-purple-600">Admissions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Basic Information
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-medium text-slate-800">{patient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Age</span>
                    <span className="font-medium text-slate-800">{patient.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-medium text-slate-800">{patient.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Blood Group</span>
                    <span className="font-medium text-slate-800">{patient.bloodGroup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Allergies</span>
                    <span className="font-medium text-red-600">{patient.allergies || 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact Details
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-800">{patient.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-800">{patient.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aadhar</span>
                    <span className="font-medium font-mono text-slate-800">{maskAadhar(patient.aadhar)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className="text-slate-500">Address</span>
                    <p className="font-medium text-slate-800 mt-1">{patient.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Emergency Contact
                </h3>
                <div className="bg-red-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-red-600">Name</span>
                    <span className="font-medium text-slate-800">{patient.emergencyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Phone</span>
                    <span className="font-medium text-slate-800">{patient.emergencyContact}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Registration Info
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient ID</span>
                    <span className="font-medium font-mono text-slate-800">{patientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered On</span>
                    <span className="font-medium text-slate-800">{formatDate(patient.createdAt)}</span>
                  </div>
                  {/* <div className="flex justify-between">
                    <span className="text-slate-500">Last Visit</span>
                    <span className="font-medium text-slate-800">{formatDate(patient.lastVisit)}</span>
                  </div> */}
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Medical Reports & Documents</h3>
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Report
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map(report => (
                  <div key={report.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${report.filePath?.endsWith('.pdf') ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {report.filePath?.endsWith('.pdf') ? (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{report.reportName}</p>
                        <p className="text-xs text-slate-500">{report.reportType}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(report.uploadedAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          let url = report.filePath
                          if (url?.includes('/image/upload/') && url?.match(/\.pdf$/i)) {
                            url = url.replace('/image/upload/', '/raw/upload/')
                          }
                          window.open(url, '_blank')
                        }}
                        className="flex-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setDeleteReportId(report.id)}
                        className="flex-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescription History Tab */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Prescription History</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{prescriptionHistory.length} prescriptions</span>
                  <Button size="sm" onClick={() => navigate(`/prescriptions/add?patientId=${patientId}`)}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Prescription
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {prescriptionHistory.map(record => (
                  <div key={record.id} className="bg-slate-50 rounded-xl p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-800">{formatDate(record.prescriptionDate)}</p>
                        <p className="text-sm text-slate-500">Prescribed by {record.user?.name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500">{record.medicines?.length || 0} medicines</p>
                        {isSuperAdmin && (
                          <button
                            onClick={() => openEditPrescription(record)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit Prescription"
                          >
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeletePrescription(record)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Prescription"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(record.medicines || []).map((med: any, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-white rounded-lg text-sm text-slate-700 border border-slate-200">
                          {med.medicineName} {med.dosage && `(${med.dosage})`}
                        </span>
                      ))}
                    </div>
                    {record.notes && (
                      <p className="text-sm text-slate-500 mt-2">Note: {record.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Services Taken</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    Total: ₹{services.reduce((sum, s) => sum + Number(s.totalFee || 0), 0).toLocaleString()}
                  </span>
                  <Button size="sm" onClick={handleOpenAssignService}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Assign Service
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Service</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Fee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assigned By</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map(svc => (
                      <tr key={svc.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 text-sm text-slate-700">{formatDate(svc.serviceDate || svc.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{svc.service?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{svc.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">₹{Number(svc.totalFee).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{svc.user?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSuperAdmin && (
                              <button
                                onClick={() => openEditService(svc)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Service"
                              >
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteService(svc)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Service"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* OPD Payments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">OPD Payments</h3>
                  <span className="text-sm text-slate-500">{opdPayments.length} records</span>
                </div>
                {opdPayments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No OPD payments</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Visit Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {opdPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-700">{formatDate(p.visitDate)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600">₹{Number(p.fee).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{p.paymentMode}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(p.paymentStatus)}`}>
                                {p.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Deposits */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Deposits</h3>
                  <span className="text-sm text-slate-500">
                    Total: ₹{deposits.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
                {deposits.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No deposits</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Receipt</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Admission</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deposits.map((dep: any) => (
                          <tr key={dep.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-3 text-sm text-slate-700">{formatDate(dep.paymentDate || dep.createdAt)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600">₹{Number(dep.amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{dep.paymentMode}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-slate-600">{dep.receiptNumber || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-blue-600">{dep.admission?.admitId || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => navigate(`/ipd/deposit/${dep.id}/slip`)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Print Slip"
                                >
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => setEditingDeposit({
                                      id: dep.id,
                                      amount: String(dep.amount),
                                      paymentMode: dep.paymentMode,
                                      notes: dep.notes || '',
                                    })}
                                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit Deposit"
                                  >
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleDeleteDeposit(dep)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Deposit"
                                  >
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Final Bills Tab */}
          {activeTab === 'bills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Final Bill History (FnF)</h3>
                {/* {currentAdmission && !hasCurrentBill && (
                  <Button onClick={() => setShowGenerateBillModal(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    Generate Final Bill
                  </Button>
                )} */}
              </div>
              
              {finalBills.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                  <p className="text-slate-500">No final bills generated yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Admission</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Room Charges</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Services</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Gross Total</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Deposits</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {finalBills.map(bill => (
                        <tr key={bill.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-blue-600">{bill.admission?.admitId || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">₹{Number(bill.roomCharges).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">₹{Number(bill.serviceCharges).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">₹{Number(bill.grossTotal).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-emerald-600">₹{Number(bill.totalDeposits).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {Number(bill.balanceDue) > 0 ? (
                              <span className="text-sm font-semibold text-red-600">₹{Number(bill.balanceDue).toLocaleString()} Due</span>
                            ) : Number(bill.refundAmount) > 0 ? (
                              <span className="text-sm font-semibold text-orange-600">₹{Number(bill.refundAmount).toLocaleString()} Refund</span>
                            ) : (
                              <span className="text-sm font-semibold text-emerald-600">Settled</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(bill.paymentStatus)}`}>
                              {bill.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatDate(bill.generatedDate || bill.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Delete Report Confirm Modal */}
      <ConfirmModal
        open={!!deleteReportId}
        onCancel={() => setDeleteReportId(null)}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Upload Report</h3>
              <button
                onClick={() => { setShowUploadModal(false); setReportFile(null); setReportName(''); }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Name *</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g., Blood Test Report"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option>Lab Report</option>
                  <option>Radiology</option>
                  <option>Cardiology</option>
                  <option>Document</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload File *</label>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer block">
                  <input
                    type="file"
                    accept="jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  />
                  {reportFile ? (
                    <div>
                      <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-slate-700 truncate">{reportFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(reportFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-sm text-slate-500">Click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowUploadModal(false); setReportFile(null); setReportName(''); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUploadReport} disabled={uploadingReport}>
                {uploadingReport ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Uploading...</>
                ) : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Final Bill Modal */}
      {showGenerateBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Generate Final Bill</h3>
              <button
                onClick={() => setShowGenerateBillModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (₹)</label>
                <input
                  type="number"
                  value={billOtherCharges}
                  onChange={(e) => setBillOtherCharges(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select 
                  value={billPaymentMode}
                  onChange={(e) => setBillPaymentMode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowGenerateBillModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleGenerateBill} disabled={generatingBill}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {generatingBill ? 'Generating...' : 'Generate Bill'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Bill View */}
      {showPrintBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 print:hidden">
              <h3 className="text-lg font-semibold text-slate-800">Final Bill</h3>
              <div className="flex items-center gap-2">
                <Button onClick={() => printBillDocument(showPrintBill)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </Button>
                <button
                  onClick={() => setShowPrintBill(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh] print:max-h-none print:overflow-visible" id="printable-bill">
              {/* Bill Summary */}
              <div className="space-y-4">
                {/* Patient Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Patient & Admission</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-slate-600">Name:</span> {patient.name}</p>
                    <p><span className="text-slate-600">Patient ID:</span> {patient.id}</p>
                    <p><span className="text-slate-600">Admit ID:</span> {showPrintBill.admission?.admitId || '-'}</p>
                    <p><span className="text-slate-600">Doctor:</span> {showPrintBill.admission?.doctor?.name || '-'}</p>
                    <p><span className="text-slate-600">Room:</span> {showPrintBill.admission?.room?.roomNumber} ({showPrintBill.admission?.room?.roomType?.type})</p>
                    <p><span className="text-slate-600">Stay:</span> {showPrintBill.days} days @ ₹{Number(showPrintBill.roomRate || 0).toLocaleString()}/day</p>
                  </div>
                </div>

                {/* Charges Breakdown */}
                <table className="w-full text-sm border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left px-3 py-2 border-b border-slate-200">Description</th>
                      <th className="text-right px-3 py-2 border-b border-slate-200">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 border-b border-slate-100">Room Charges ({showPrintBill.days} days)</td>
                      <td className="text-right px-3 py-2 border-b border-slate-100">{Number(showPrintBill.roomCharges).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border-b border-slate-100">Service Charges</td>
                      <td className="text-right px-3 py-2 border-b border-slate-100">{Number(showPrintBill.serviceCharges).toLocaleString()}</td>
                    </tr>
                    {Number(showPrintBill.otherCharges) > 0 && (
                      <tr>
                        <td className="px-3 py-2 border-b border-slate-100">Other Charges</td>
                        <td className="text-right px-3 py-2 border-b border-slate-100">{Number(showPrintBill.otherCharges).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white">
                      <td className="px-3 py-3 font-bold text-lg">GROSS TOTAL</td>
                      <td className="text-right px-3 py-3 font-bold text-lg">₹{Number(showPrintBill.grossTotal).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Deposits */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-emerald-800">Total Deposits</span>
                    <span className="text-emerald-800">₹{Number(showPrintBill.totalDeposits).toLocaleString()}</span>
                  </div>
                </div>

                {/* Balance Summary */}
                <div className={`rounded-lg p-4 ${
                  Number(showPrintBill.balanceDue) > 0 ? 'bg-red-50 border border-red-200' :
                  Number(showPrintBill.refundAmount) > 0 ? 'bg-orange-50 border border-orange-200' :
                  'bg-emerald-50 border border-emerald-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold text-lg ${
                      Number(showPrintBill.balanceDue) > 0 ? 'text-red-800' :
                      Number(showPrintBill.refundAmount) > 0 ? 'text-orange-800' :
                      'text-emerald-800'
                    }`}>
                      {Number(showPrintBill.balanceDue) > 0 ? 'BALANCE DUE' :
                       Number(showPrintBill.refundAmount) > 0 ? 'REFUND DUE' :
                       'FULLY SETTLED'}
                    </span>
                    <span className={`font-bold text-xl ${
                      Number(showPrintBill.balanceDue) > 0 ? 'text-red-800' :
                      Number(showPrintBill.refundAmount) > 0 ? 'text-orange-800' :
                      'text-emerald-800'
                    }`}>
                      ₹{(Number(showPrintBill.balanceDue) > 0 ? Number(showPrintBill.balanceDue) :
                         Number(showPrintBill.refundAmount) > 0 ? Number(showPrintBill.refundAmount) : 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-4">
                  <p>Payment Status: {showPrintBill.paymentStatus} | Mode: {showPrintBill.paymentMode || '-'}</p>
                  <p className="mt-1 text-xs">Generated on: {showPrintBill.generatedDate ? formatDate(showPrintBill.generatedDate) : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Assign Service Modal */}
      {showAssignServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Assign Services</h3>
              <button
                onClick={() => setShowAssignServiceModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Available Services */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Services</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {allServices.filter(s => s.status !== 'INACTIVE').map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => handleAddServiceToList(svc)}
                      disabled={!!selectedServices.find(s => s.id === svc.id)}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        selectedServices.find(s => s.id === svc.id) 
                          ? 'border-blue-300 bg-blue-50 text-blue-700' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <p className="font-medium text-sm">{svc.name}</p>
                      <p className="text-xs text-slate-500">₹{Number(svc.fee).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Services */}
              {selectedServices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Selected Services</label>
                  <div className="space-y-2">
                    {selectedServices.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-800">{svc.name}</p>
                          <p className="text-xs text-slate-500">₹{svc.fee.toLocaleString()} each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleServiceQuantityChange(svc.id, svc.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >-</button>
                            <span className="w-8 text-center text-sm font-medium">{svc.quantity}</span>
                            <button
                              onClick={() => handleServiceQuantityChange(svc.id, svc.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >+</button>
                          </div>
                          <span className="text-sm font-semibold w-20 text-right">₹{(svc.fee * svc.quantity).toLocaleString()}</span>
                          <button
                            onClick={() => handleRemoveServiceFromList(svc.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-800">Total</span>
                      <span className="font-bold text-lg text-slate-800">
                        ₹{selectedServices.reduce((sum, s) => sum + s.fee * s.quantity, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowAssignServiceModal(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAssignServices} 
                disabled={selectedServices.length === 0 || assigningServices}
              >
                {assigningServices ? 'Assigning...' : `Assign ${selectedServices.length} Service${selectedServices.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Patient Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Patient</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    maxLength={10}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar</label>
                  <input
                    type="text"
                    value={editForm.aadhar}
                    onChange={(e) => setEditForm({ ...editForm, aadhar: e.target.value })}
                    maxLength={12}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    value={editForm.allergies}
                    onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                    placeholder="e.g., Penicillin, Dust"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={editForm.emergencyName}
                    onChange={(e) => setEditForm({ ...editForm, emergencyName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    maxLength={10}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdatePatient} disabled={updatingPatient}>
                {updatingPatient ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Updating...</>
                ) : 'Update Patient'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        title="Patient Updated!"
        message="Patient details have been updated successfully."
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Edit Admission Modal */}
      {editingAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Edit IPD Admission</h3>
                <p className="text-xs text-slate-500">
                  Admit #{editingAdmission.admitId} — {patient?.name}
                </p>
              </div>
              <button onClick={() => setEditingAdmission(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Admission Date"
                  type="date"
                  value={editAdmitForm.admissionDate?.slice(0, 10)}
                  onChange={(e) => setEditAdmitForm({ ...editAdmitForm, admissionDate: e.target.value })}
                />
                <Input
                  label="Expected Discharge"
                  type="date"
                  value={editAdmitForm.expectedDischarge?.slice(0, 10)}
                  onChange={(e) => setEditAdmitForm({ ...editAdmitForm, expectedDischarge: e.target.value })}
                />
              </div>

              <Select
                label="Doctor"
                value={editAdmitForm.doctorId}
                onChange={(e) => setEditAdmitForm({ ...editAdmitForm, doctorId: e.target.value })}
                options={doctors.map(d => ({
                  value: d.id,
                  label: `${d.name}${d.specialization ? ` (${d.specialization})` : ''}`,
                }))}
              />

              <Select
                label="Room Type"
                value={editRoomTypeId}
                onChange={(e) => {
                  setEditRoomTypeId(e.target.value)
                  setEditAdmitForm({ ...editAdmitForm, roomId: '', bedId: '' })
                }}
                options={roomTypes.map((t: any) => ({
                  value: t.id,
                  label: `${t.type.replace(/_/g, ' ')} (₹${t.rentPerDay}/day)`,
                }))}
              />

              <Select
                label="Room"
                value={editAdmitForm.roomId}
                onChange={(e) => setEditAdmitForm({ ...editAdmitForm, roomId: e.target.value, bedId: '' })}
                options={(
                  editRoomTypeId
                    ? rooms.filter((r: any) => r.roomTypeId === editRoomTypeId)
                    : rooms
                ).map((r: any) => ({
                  value: r.id,
                  label: `Room ${r.roomNumber}`,
                }))}
              />

              <Select
                label="Bed"
                value={editAdmitForm.bedId}
                onChange={(e) => setEditAdmitForm({ ...editAdmitForm, bedId: e.target.value })}
                options={
                  rooms
                    .find((r: any) => r.id === editAdmitForm.roomId)
                    ?.beds?.filter((b: any) => b.status === 'AVAILABLE' || b.id === editingAdmission?.bed?.id)
                    .map((b: any) => ({
                      value: b.id,
                      label: `Bed ${b.bedNumber}${b.id === editingAdmission?.bed?.id ? ' (current)' : ''}`,
                    })) || []
                }
              />

              <div>
                <label className="text-sm font-medium text-slate-600">Diagnosis</label>
                <textarea
                  value={editAdmitForm.diagnosis}
                  onChange={(e) => setEditAdmitForm({ ...editAdmitForm, diagnosis: e.target.value })}
                  className="w-full mt-1 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                  rows={3}
                />
              </div>

              <Select
                label="Status"
                value={editAdmitForm.status}
                onChange={(e) => setEditAdmitForm({ ...editAdmitForm, status: e.target.value })}
                options={[
                  { value: 'ADMITTED', label: 'Admitted' },
                  { value: 'CRITICAL', label: 'Critical' },
                  { value: 'READY_FOR_DISCHARGE', label: 'Ready for Discharge' },
                  { value: 'DISCHARGED', label: 'Discharged' },
                ]}
              />

              {editAdmitError && (
                <p className="text-sm text-red-500">{editAdmitError}</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAdmission(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleEditAdmitSave} isLoading={editAdmitLoading}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prescription Modal */}
      {editingPrescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Edit Prescription</h3>
                <p className="text-xs text-slate-500">
                  {formatDate(editingPrescription.prescriptionDate)} — by {editingPrescription.user?.name || 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => setEditingPrescription(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editPrescriptionForm.notes}
                  onChange={(e) => setEditPrescriptionForm({ ...editPrescriptionForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Prescription notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Medicines</label>
                  <button
                    onClick={addMedicineRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Medicine
                  </button>
                </div>
                <div className="space-y-3">
                  {editPrescriptionForm.medicines.map((med, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Medicine #{idx + 1}</span>
                        {editPrescriptionForm.medicines.length > 1 && (
                          <button
                            onClick={() => removeMedicineRow(idx)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={med.medicineName}
                          onChange={(e) => updateMedicineRow(idx, 'medicineName', e.target.value)}
                          placeholder="Medicine Name *"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedicineRow(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (e.g. 500mg) *"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <select
                          value={med.form}
                          onChange={(e) => updateMedicineRow(idx, 'form', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="Tablet">Tablet</option>
                          <option value="Capsule">Capsule</option>
                          <option value="Syrup">Syrup</option>
                          <option value="Injection">Injection</option>
                          <option value="Cream">Cream</option>
                          <option value="Drops">Drops</option>
                          <option value="Inhaler">Inhaler</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={med.quantity}
                          onChange={(e) => updateMedicineRow(idx, 'quantity', e.target.value)}
                          placeholder="Qty *"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedicineRow(idx, 'frequency', e.target.value)}
                          placeholder="Frequency (e.g. 3 times/day) *"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <input
                          type="number"
                          value={med.days}
                          onChange={(e) => updateMedicineRow(idx, 'days', e.target.value)}
                          placeholder="Days *"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => updateMedicineRow(idx, 'instructions', e.target.value)}
                        placeholder="Instructions (e.g. after food)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingPrescription(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleEditPrescriptionSave}
                disabled={editPrescriptionLoading || editPrescriptionForm.medicines.length === 0}
              >
                {editPrescriptionLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Updating...</>
                ) : 'Update Prescription'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Assigned Service</h3>
              <button onClick={() => setEditingService(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  value={editServiceForm.serviceId}
                  onChange={e => setEditServiceForm(f => ({ ...f, serviceId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select Service</option>
                  {allServices.filter(s => s.status !== 'INACTIVE').map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} — ₹{Number(s.fee).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={editServiceForm.quantity}
                  onChange={e => setEditServiceForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Date</label>
                <input
                  type="date"
                  value={editServiceForm.serviceDate}
                  onChange={e => setEditServiceForm(f => ({ ...f, serviceDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editServiceForm.notes}
                  onChange={e => setEditServiceForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setEditingService(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditServiceSave} disabled={editServiceLoading}>
                {editServiceLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deposit Modal */}
      {editingDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Deposit</h3>
              <button
                onClick={() => setEditingDeposit(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={editingDeposit.amount}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={editingDeposit.paymentMode}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, paymentMode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="ONLINE">Online Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editingDeposit.notes}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingDeposit(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleEditDepositSave}
                disabled={!editingDeposit.amount || editDepositLoading}
              >
                {editDepositLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Updating...</>
                ) : 'Update Deposit'}
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

      {/* Dynamic Success Modal */}
      <SuccessModal
        open={successMsg.open}
        title="Success"
        message={successMsg.message}
        onClose={() => setSuccessMsg({ open: false, message: '' })}
      />
    </div>
  )
}

export default PatientDetail
