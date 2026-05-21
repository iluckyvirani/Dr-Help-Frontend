import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Badge } from '../../components/ui'
import { billingAPI, settingsAPI } from '../../api/endpoints'
import { printBillDocument, numberToWords } from '../../utils/printBill'
import { ConfirmModal, SuccessModal } from '../../components/modal'
import { useAppSelector } from '../../hooks/useRedux'

const paymentModeOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
]

const paymentModeLabel = (mode: string) =>
  paymentModeOptions.find(m => m.value === mode)?.label || mode

const BillingDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [bills, setBills] = useState<any[]>([])
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([])
  const [stats, setStats] = useState({ totalBills: 0, pendingBills: 0, todayCollection: 0, monthCollection: 0 })
  const [loading, setLoading] = useState(true)
  const [hospitalSettings, setHospitalSettings] = useState<any>({ name: 'Dr Help', address: '', phone: '', logo: '' })
  const [activeTab, setActiveTab] = useState<'bills' | 'deposits' | 'refunds'>('bills')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [patientIdSearch, setPatientIdSearch] = useState('')
  const [showBillPreview, setShowBillPreview] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null)
  const [showRefundModal, setShowRefundModal] = useState<any>(null)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [refundMode, setRefundMode] = useState('CASH')
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [page, setPage] = useState(1)
  const [billPagination, setBillPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  // Deposit form
  const [depositAdmitId, setDepositAdmitId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositRemarks, setDepositRemarks] = useState('')
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0])

  // Deposit listing state
  const [deposits, setDeposits] = useState<any[]>([])
  const [depositsLoading, setDepositsLoading] = useState(false)
  const [depositSearch, setDepositSearch] = useState('')
  const [debouncedDepositSearch, setDebouncedDepositSearch] = useState('')
  const [depositDateFrom, setDepositDateFrom] = useState('')
  const [depositDateTo, setDepositDateTo] = useState('')
  const [depositPage, setDepositPage] = useState(1)
  const [depositPagination, setDepositPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [refundDateFrom, setRefundDateFrom] = useState('')
  const [refundDateTo, setRefundDateTo] = useState('')
  const [downloadingRefundPdf, setDownloadingRefundPdf] = useState(false)

  // Edit bill state
  const [editingBill, setEditingBill] = useState<any>(null)
  const [editBillForm, setEditBillForm] = useState({
    serviceCharges: '', otherCharges: '', discountAmount: '',
    paymentMode: '', paymentStatus: '', notes: '',
  })
  const [editBillLoading, setEditBillLoading] = useState(false)

  // Loading states for view/print buttons
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null)
  const [printingBillId, setPrintingBillId] = useState<string | null>(null)
  const [collectingPayment, setCollectingPayment] = useState(false)
  const [processingRefund, setProcessingRefund] = useState(false)

  // Confirm & success modal state
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchData = async () => {
    try {
      const billParams: Record<string, any> = { page, limit: 20 }
      if (debouncedSearch.trim()) billParams.search = debouncedSearch.trim()
      if (statusFilter) billParams.paymentStatus = statusFilter
      if (dateFrom) billParams.from = dateFrom
      if (dateTo) billParams.to = dateTo

      const [dashRes, billsRes, settingsRes] = await Promise.all([
        billingAPI.getDashboard(),
        billingAPI.getBills(billParams),
        settingsAPI.getHospital(),
      ])
      const dash = dashRes.data.data || {}
      setStats(dash.stats || { totalBills: 0, pendingBills: 0, todayCollection: 0, monthCollection: 0 })
      const billData = billsRes.data.data
      setBills(billData.bills || billData || [])
      if (billData.pagination) setBillPagination(billData.pagination)
      setPendingRefunds(dash.pendingRefunds || [])
      if (settingsRes.data.data) setHospitalSettings(settingsRes.data.data)
    } catch (err) {
      console.error('Failed to fetch billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, debouncedSearch, statusFilter, dateFrom, dateTo])

  // Debounce deposit search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDepositSearch(depositSearch)
      setDepositPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [depositSearch])

  // Fetch deposits (paginated)
  const fetchDeposits = async () => {
    setDepositsLoading(true)
    try {
      const params: Record<string, any> = { page: depositPage, limit: 10 }
      if (debouncedDepositSearch.trim()) params.search = debouncedDepositSearch.trim()
      if (depositDateFrom) params.from = depositDateFrom
      if (depositDateTo) params.to = depositDateTo
      const res = await billingAPI.getDeposits(params)
      const data = res.data.data
      setDeposits(data.deposits || [])
      if (data.pagination) setDepositPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch deposits:', err)
    } finally {
      setDepositsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'deposits') fetchDeposits()
  }, [activeTab, depositPage, debouncedDepositSearch, depositDateFrom, depositDateTo])

  // Download deposits PDF
  const handleDownloadDepositsPdf = async () => {
    setDownloadingPdf(true)
    try {
      const params: Record<string, any> = {}
      if (depositDateFrom) params.from = depositDateFrom
      if (depositDateTo) params.to = depositDateTo
      if (debouncedDepositSearch.trim()) params.search = debouncedDepositSearch.trim()
      const res = await billingAPI.exportDepositsPdf(params)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `Deposits_Report_${depositDateFrom || 'all'}_${depositDateTo || 'all'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download PDF. Make sure there are records for the selected filters.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Download refunds PDF
  const handleDownloadRefundsPdf = async () => {
    setDownloadingRefundPdf(true)
    try {
      const params: Record<string, any> = {}
      if (refundDateFrom) params.from = refundDateFrom
      if (refundDateTo) params.to = refundDateTo
      const res = await billingAPI.exportRefundsPdf(params)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `Refunds_Report_${refundDateFrom || 'all'}_${refundDateTo || 'all'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download PDF. Make sure there are records for the selected filters.')
    } finally {
      setDownloadingRefundPdf(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setShowSuccessModal(true)
  }

  // Helper accessors for bill data
  const getBillPatientName = (bill: any) => bill.patient?.name || '-'
  const getBillPatientId = (bill: any) => bill.patient?.id || '-'
  const getBillPatientPhone = (bill: any) => bill.patient?.phone || '-'
  const getBillPatientAddress = (bill: any) => bill.patient?.address || '-'
  const getBillAdmitDate = (bill: any) => bill.createdAt

  // Filter bills - API handles search, status, dates
  const filteredBills = bills

  // Compute pending amount and refund amount from bills
  const pendingAmount = bills.filter(b => b.paymentStatus === 'PENDING').reduce((sum, b) => sum + Number(b.balanceDue || 0), 0)
  const refundAmount = pendingRefunds.reduce((sum: number, r: any) => sum + Number(r.refundAmount || 0), 0)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
      'PAID': { variant: 'success', label: 'Paid' },
      'PENDING': { variant: 'danger', label: 'Pending' },
      'PARTIAL': { variant: 'warning', label: 'Partial' },
    }
    const c = config[status] || { variant: 'info' as const, label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  // Fetch full bill data then print
  const handlePrintBill = async (bill: any) => {
    if (printingBillId) return
    setPrintingBillId(bill.id)
    try {
      printBillDocument(bill)
    } catch {
      printBillDocument(bill)
    } finally {
      setPrintingBillId(null)
    }
  }

  // Open bill preview
  const handleViewBill = async (bill: any) => {
    if (loadingBillId) return
    setLoadingBillId(bill.id)
    try {
      setShowBillPreview(bill)
    } finally {
      setLoadingBillId(null)
    }
  }

  const handleGenerateBill = () => {
    if (!patientIdSearch.trim()) {
      alert('Please enter Patient ID or Admit ID')
      return
    }
    navigate(`/billing/generate?search=${patientIdSearch}`)
  }

  const handleCollectPayment = async () => {
    if (!showPaymentModal || collectingPayment) return
    setCollectingPayment(true)
    try {
      await billingAPI.updatePayment(showPaymentModal.id, {
        paymentStatus: 'PAID',
        paymentMode: paymentMode,
      })
      setShowPaymentModal(null)
      await fetchData()
      showSuccess('Payment collected successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to collect payment')
    } finally {
      setCollectingPayment(false)
    }
  }

  // Bill edit/delete handlers
  const openEditBill = (bill: any) => {
    setEditingBill(bill)
    setEditBillForm({
      serviceCharges: String(bill.serviceCharges || 0),
      otherCharges: String(bill.otherCharges || 0),
      discountAmount: String(bill.discountAmount || 0),
      paymentMode: bill.paymentMode || '',
      paymentStatus: bill.paymentStatus || 'PENDING',
      notes: bill.notes || '',
    })
  }

  const handleEditBillSave = async () => {
    if (!editingBill) return
    setEditBillLoading(true)
    try {
      await billingAPI.update(editingBill.id, {
        serviceCharges: Number(editBillForm.serviceCharges),
        otherCharges: Number(editBillForm.otherCharges),
        discountAmount: Number(editBillForm.discountAmount),
        paymentMode: editBillForm.paymentMode || undefined,
        paymentStatus: editBillForm.paymentStatus || undefined,
        notes: editBillForm.notes || undefined,
      })
      setEditingBill(null)
      showSuccess('Bill updated successfully!')
      fetchData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update bill')
    } finally {
      setEditBillLoading(false)
    }
  }

  const handleDeleteBill = (bill: any) => {
    setConfirmModal({
      open: true,
      title: 'Delete Bill',
      message: `Are you sure you want to delete bill #${bill.id.slice(-8)} for ${getBillPatientName(bill)}? This action cannot be undone.`,
      onConfirm: async () => {
        await billingAPI.delete(bill.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess('Bill deleted successfully!')
        fetchData()
      }
    })
  }

  const handleAddDeposit = async () => {
    if (!depositAdmitId || !depositAmount) {
      alert('Please enter Patient ID and amount')
      return
    }
    try {
      await billingAPI.createDeposit({
        patientId: depositAdmitId,
        amount: parseFloat(depositAmount),
        paymentMode: paymentMode,
        notes: depositRemarks || undefined,
        paymentDate: depositDate || undefined,
      })
      setShowDepositModal(false)
      setDepositAdmitId('')
      setDepositAmount('')
      setDepositRemarks('')
      setDepositDate(new Date().toISOString().split('T')[0])
      await fetchData()
      if (activeTab === 'deposits') await fetchDeposits()
      showSuccess('Deposit added successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add deposit')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing Management</h1>
          <p className="text-slate-500">Generate final bills, manage deposits and refunds</p>
        </div>
        {/* Quick Generate Bill */}
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Enter Patient ID / Admit ID"
            value={patientIdSearch}
            onChange={(e) => setPatientIdSearch(e.target.value)}
            className="w-56"
          />
          <Button onClick={handleGenerateBill} className="whitespace-nowrap">
            <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            Generate Bill
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalBills}</p>
              <p className="text-sm text-slate-500">Total Bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingBills}</p>
              <p className="text-sm text-slate-500">Pending Bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">₹{pendingAmount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Pending Amount</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">₹{Number(stats.todayCollection).toLocaleString()}</p>
              <p className="text-sm text-slate-500">Today's Collection</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">₹{refundAmount.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Refunds ({pendingRefunds.length})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="border-b border-slate-100">
          <div className="flex">
            {[
              { id: 'bills', label: 'Final Bills', count: stats.totalBills },
              { id: 'deposits', label: 'Deposits', count: depositPagination.total },
              { id: 'refunds', label: 'Refunds', count: pendingRefunds.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {tab.count}
                </span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
          
        </div>

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by Bill No, Patient ID, Admit ID, Name, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 pl-11 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-3">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From Date"
                  className="w-36"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To Date"
                  className="w-36"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'PAID', label: 'Paid' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'PARTIAL', label: 'Partial' },
                  ]}
                  className="w-40"
                />
              </div>
            </div>

            {/* Bills Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bill No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bill Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Gross Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Deposits</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
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
                    filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                          </svg>
                          <p className="text-slate-500">No bills found</p>
                        </td>
                      </tr>
                    ) : (filteredBills.map(bill => (
                      <tr key={bill.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-blue-600">{bill.billNumber}</span>
                          <p className="text-xs text-slate-400">{formatDate(bill.generatedDate)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{getBillPatientName(bill)}</p>
                          <p className="text-xs text-slate-500">{getBillPatientId(bill)} • {getBillPatientPhone(bill)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{formatDate(getBillAdmitDate(bill))}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-slate-800">₹{Number(bill.grossTotal).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-emerald-600">₹{Number(bill.totalDeposits).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          {Number(bill.balanceDue) > 0 ? (
                            <span className="text-sm font-semibold text-red-600">₹{Number(bill.balanceDue).toLocaleString()}</span>
                          ) : Number(bill.refundAmount) > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-orange-600">-₹{Number(bill.refundAmount).toLocaleString()}</span>
                              {bill.refundDate ? (
                                <span className="text-[10px] text-emerald-600">Refunded</span>
                              ) : (
                                <span className="text-[10px] text-orange-500">Pending</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-emerald-600">₹0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(bill.paymentStatus)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewBill(bill)}
                              disabled={loadingBillId === bill.id}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="View Bill"
                            >
                              {loadingBillId === bill.id ? (
                                <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handlePrintBill(bill)}
                              disabled={printingBillId === bill.id}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Print Bill"
                            >
                              {printingBillId === bill.id ? (
                                <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              )}
                            </button>
                            {bill.paymentStatus === 'PENDING' && (
                              <button
                                onClick={() => setShowPaymentModal(bill)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Collect
                              </button>
                            )}
                            {Number(bill.refundAmount) > 0 && !bill.refundDate && (
                              <button
                                onClick={() => { setRefundDate(new Date().toISOString().split('T')[0]); setShowRefundModal(bill) }}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Refund
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => openEditBill(bill)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Bill"
                              >
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteBill(bill)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Bill"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )))}
                </tbody>
              </table>
            </div>

            {filteredBills.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                <p className="text-slate-500">No bills found</p>
              </div>
            )}

            {/* Bills Pagination */}
            {filteredBills.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium">{(billPagination.page - 1) * billPagination.limit + 1}</span>–<span className="font-medium">{Math.min(billPagination.page * billPagination.limit, billPagination.total)}</span> of <span className="font-medium">{billPagination.total}</span> bills
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={billPagination.page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {billPagination.page} of {billPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={billPagination.page >= billPagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by Receipt No, Patient Name, Phone, Admit ID..."
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  className="w-full px-4 py-2.5 pl-11 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={depositDateFrom}
                  onChange={(e) => { setDepositDateFrom(e.target.value); setDepositPage(1) }}
                  placeholder="From Date"
                  className="w-36"
                />
                <Input
                  type="date"
                  value={depositDateTo}
                  onChange={(e) => { setDepositDateTo(e.target.value); setDepositPage(1) }}
                  placeholder="To Date"
                  className="w-36"
                />
                <Button
                  variant="outline"
                  onClick={handleDownloadDepositsPdf}
                  disabled={downloadingPdf}
                  title="Download PDF"
                >
                  {downloadingPdf ? (
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {downloadingPdf ? 'Downloading...' : 'PDF'}
                </Button>
                
              </div>
            </div>
            <Button onClick={() => setShowDepositModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Deposit
                </Button>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Receipt No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depositsLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : deposits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-slate-500">No deposits found</p>
                      </td>
                    </tr>
                  ) : deposits.map((deposit: any) => (
                    <tr key={deposit.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-blue-600">{deposit.receiptNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{deposit.patient?.id || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(deposit.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-emerald-600">₹{Number(deposit.amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{paymentModeLabel(deposit.paymentMode)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{deposit.patient?.name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => {}} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Print Receipt">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Deposits Pagination */}
            {deposits.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-medium">{(depositPagination.page - 1) * depositPagination.limit + 1}</span>–<span className="font-medium">{Math.min(depositPagination.page * depositPagination.limit, depositPagination.total)}</span> of <span className="font-medium">{depositPagination.total}</span> deposits
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={depositPagination.page <= 1}
                    onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {depositPagination.page} of {depositPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={depositPagination.page >= depositPagination.totalPages}
                    onClick={() => setDepositPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800">Refund Management</h3>

            {/* Filters */}
            <div className="flex items-center flex-col lg:flex-row gap-4">
              <div className="flex-1" />
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={refundDateFrom}
                  onChange={(e) => setRefundDateFrom(e.target.value)}
                  placeholder="From Date"
                  className="w-36"
                />
                <Input
                  type="date"
                  value={refundDateTo}
                  onChange={(e) => setRefundDateTo(e.target.value)}
                  placeholder="To Date"
                  className="w-36"
                />
                <Button
                  variant="outline"
                  onClick={handleDownloadRefundsPdf}
                  disabled={downloadingRefundPdf}
                  title="Download PDF"
                >
                  {downloadingRefundPdf ? (
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {downloadingRefundPdf ? 'Downloading...' : 'PDF'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bill No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Refund Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bill Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Refund Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingRefunds.map((refund: any) => (
                    <tr key={refund.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-blue-600">{refund.id.slice(-8)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{refund.patient?.name || '-'}</p>
                        <p className="text-xs text-slate-500">{refund.patient?.id || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-orange-600">₹{Number(refund.refundAmount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(refund.generatedDate)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{refund.refundDate ? formatDate(refund.refundDate) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{refund.refundMode || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={refund.refundDate ? 'success' : 'warning'}>
                          {refund.refundDate ? 'Refunded' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!refund.refundDate && (
                          <button
                            onClick={() => { setRefundDate(new Date().toISOString().split('T')[0]); setShowRefundModal(refund) }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Process Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pendingRefunds.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <p className="text-slate-500">No refunds found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bill Preview Modal */}
      {showBillPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Bill Preview - {showBillPreview.billNumber || showBillPreview.id?.slice(-8)}</h3>
              <div className="flex items-center gap-2">
                <Button onClick={() => handlePrintBill(showBillPreview)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </Button>
                <button
                  onClick={() => setShowBillPreview(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]" id="printable-bill">
              {/* Hospital Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
                {hospitalSettings.logo && (
                  <img src={hospitalSettings.logo} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                )}
                <h1 className="text-2xl font-bold text-slate-800">{hospitalSettings.name || 'Dr Help'}</h1>
                <p className="text-sm text-slate-600">{hospitalSettings.address || '42/4 बी, बिल्लोचपुरा, मथुरा रोड, आगरा-2'}</p>
                <p className="text-sm text-slate-600">Phone: {hospitalSettings.phone || '74090 00917'}</p>
                <p className="text-lg font-semibold text-blue-600 mt-2">FINAL BILL</p>
              </div>

              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p><span className="font-semibold">Bill ID:</span> {showBillPreview.billNumber || showBillPreview.id?.slice(-8)}</p>
                  <p><span className="font-semibold">Date:</span> {formatDate(showBillPreview.generatedDate)}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold">Payment Status:</span> {showBillPreview.paymentStatus}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-slate-800 mb-2">Patient Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-slate-600">Name:</span> <span className="font-medium">{getBillPatientName(showBillPreview)}</span></p>
                  <p><span className="text-slate-600">Patient ID:</span> {getBillPatientId(showBillPreview)}</p>
                  <p><span className="text-slate-600">Phone:</span> {getBillPatientPhone(showBillPreview)}</p>
                  <p><span className="text-slate-600">Address:</span> {getBillPatientAddress(showBillPreview)}</p>
                </div>
              </div>

              {/* Charges Table */}
              <table className="w-full text-sm mb-4 border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2 border-b border-slate-200">Description</th>
                    <th className="text-center px-3 py-2 border-b border-slate-200">Qty</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Rate (₹)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Services */}
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="px-3 py-2 font-semibold text-blue-800 border-b border-slate-200">Services</td>
                  </tr>
                  {(showBillPreview.patient?.patientServices || showBillPreview.patientServices || []).map((svc: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 border-b border-slate-100">{svc.service?.name || 'Service'}</td>
                      <td className="text-center px-3 py-2 border-b border-slate-100">{svc.quantity || 1}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-100">{(Number(svc.totalFee) / (svc.quantity || 1)).toLocaleString()}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-100">{Number(svc.totalFee).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-3 py-2 text-right font-medium border-b border-slate-200">Services Subtotal</td>
                    <td className="text-right px-3 py-2 font-medium border-b border-slate-200">₹{Number(showBillPreview.serviceCharges).toLocaleString()}</td>
                  </tr>

                  {/* Other Charges */}
                  {Number(showBillPreview.otherCharges) > 0 && (
                    <>
                      <tr className="bg-blue-50">
                        <td colSpan={4} className="px-3 py-2 font-semibold text-blue-800 border-b border-slate-200">Other Charges</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 border-b border-slate-100">Additional Charges</td>
                        <td className="text-center px-3 py-2 border-b border-slate-100">1</td>
                        <td className="text-right px-3 py-2 border-b border-slate-100">{Number(showBillPreview.otherCharges).toLocaleString()}</td>
                        <td className="text-right px-3 py-2 border-b border-slate-100">{Number(showBillPreview.otherCharges).toLocaleString()}</td>
                      </tr>
                    </>
                  )}

                  {/* Discount */}
                  {Number(showBillPreview.discountAmount || 0) > 0 && (
                    <tr className="bg-amber-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-amber-800 border-b border-slate-200">Discount</td>
                      <td className="text-right px-3 py-2 font-medium text-amber-800 border-b border-slate-200">- ₹{Number(showBillPreview.discountAmount).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white">
                    <td colSpan={3} className="px-3 py-3 font-bold text-lg">GROSS TOTAL</td>
                    <td className="text-right px-3 py-3 font-bold text-lg">₹{Number(showBillPreview.grossTotal).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-left font-semibold text-blue-800 text-xs bg-blue-50 border-t border-slate-200">
                      Amount in Words: {numberToWords(Math.round(Number(showBillPreview.grossTotal)))}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Deposits */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-emerald-800 mb-2">Deposits Received</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {(showBillPreview.patient?.deposits || showBillPreview.deposits || []).map((dep: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1">{formatDate(dep.paymentDate)}</td>
                        <td className="py-1">{paymentModeLabel(dep.paymentMode)}</td>
                        <td className="py-1 text-right font-medium">₹{Number(dep.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-emerald-300 font-semibold">
                      <td colSpan={2} className="py-2">Total Deposits</td>
                      <td className="py-2 text-right">₹{Number(showBillPreview.totalDeposits).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Balance Summary */}
              <div className={`rounded-lg p-4 mb-4 ${Number(showBillPreview.balanceDue) > 0 ? 'bg-red-50 border border-red-200' :
                Number(showBillPreview.refundAmount) > 0 ? 'bg-orange-50 border border-orange-200' :
                  'bg-emerald-50 border border-emerald-200'
                }`}>
                <div className="flex justify-between items-center">
                  <span className={`font-semibold text-lg ${Number(showBillPreview.balanceDue) > 0 ? 'text-red-800' :
                    Number(showBillPreview.refundAmount) > 0 ? 'text-orange-800' :
                      'text-emerald-800'
                    }`}>
                    {Number(showBillPreview.balanceDue) > 0 ? 'BALANCE DUE' :
                      Number(showBillPreview.refundAmount) > 0 ? 'REFUND DUE' :
                        'FULLY SETTLED'}
                  </span>
                  <span className={`text-2xl font-bold ${Number(showBillPreview.balanceDue) > 0 ? 'text-red-800' :
                    Number(showBillPreview.refundAmount) > 0 ? 'text-orange-800' :
                      'text-emerald-800'
                    }`}>
                    ₹{(Number(showBillPreview.balanceDue) > 0 ? Number(showBillPreview.balanceDue) :
                      Number(showBillPreview.refundAmount) > 0 ? Number(showBillPreview.refundAmount) : 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              {showBillPreview.paymentStatus === 'PAID' && (
                <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 text-center">
                  <p className="text-emerald-800 font-semibold">
                    ✓ PAID IN FULL - {paymentModeLabel(showBillPreview.paymentMode)} on {formatDate(showBillPreview.generatedDate)}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-4 mt-4">
                <p>Generated by: Reception | Date: {formatDate(showBillPreview.generatedDate)}</p>
                <p className="mt-1 text-xs">This is a computer generated bill. For queries, contact billing desk.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Collection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Collect Payment</h3>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Bill ID</p>
                <p className="font-semibold text-slate-800">{showPaymentModal.id.slice(-8)}</p>
                <p className="text-sm text-slate-500 mt-2">Patient</p>
                <p className="font-medium text-slate-800">{getBillPatientName(showPaymentModal)}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-red-700 font-medium">Balance Due</span>
                  <span className="text-2xl font-bold text-red-700">₹{Number(showPaymentModal.balanceDue).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <Select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  options={paymentModeOptions}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Received</label>
                <Input
                  type="number"
                  defaultValue={Number(showPaymentModal.balanceDue)}
                  className="text-lg font-semibold"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCollectPayment} disabled={collectingPayment}>
                {collectingPayment ? (
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {collectingPayment ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Process Refund</h3>
              <button
                onClick={() => setShowRefundModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Bill ID</p>
                <p className="font-semibold text-slate-800">{showRefundModal.id.slice(-8)}</p>
                <p className="text-sm text-slate-500 mt-2">Patient</p>
                <p className="font-medium text-slate-800">{getBillPatientName(showRefundModal)}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-orange-700 font-medium">Refund Amount</span>
                  <span className="text-2xl font-bold text-orange-700">₹{Number(showRefundModal.refundAmount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Date</label>
                <Input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Mode</label>
                <Select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/IMPS)' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'CHEQUE', label: 'Cheque' },
                  ]}
                />
              </div>

              {refundMode === 'BANK_TRANSFER' && (
                <div className="space-y-3">
                  <Input placeholder="Account Number" />
                  <Input placeholder="IFSC Code" />
                  <Input placeholder="Account Holder Name" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <Input placeholder="Optional remarks..." />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRefundModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={processingRefund} onClick={async () => {
                if (processingRefund) return
                setProcessingRefund(true)
                try {
                  await billingAPI.updatePayment(showRefundModal.id, {
                    refundDate,
                    refundMode,
                  })
                  setShowRefundModal(null)
                  await fetchData()
                  showSuccess('Refund processed successfully!')
                } catch (err: any) {
                  alert(err.response?.data?.message || 'Failed to process refund')
                } finally {
                  setProcessingRefund(false)
                }
              }}>
                {processingRefund ? (
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                )}
                {processingRefund ? 'Processing...' : 'Process Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Add Deposit</h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID</label>
                <Input placeholder="Enter Patient ID" value={depositAdmitId} onChange={(e) => setDepositAdmitId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <Input type="number" placeholder="Enter deposit amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <Select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  options={paymentModeOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <Input placeholder="Optional remarks..." value={depositRemarks} onChange={(e) => setDepositRemarks(e.target.value)} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDepositModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddDeposit}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Add Deposit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Bill #{editingBill.id.slice(-8)}</h3>
              <button onClick={() => setEditingBill(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm text-slate-500">Patient: <span className="font-medium text-slate-800">{getBillPatientName(editingBill)}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Charges (₹)</label>
                  <input
                    type="number"
                    value={editBillForm.serviceCharges}
                    onChange={e => setEditBillForm(f => ({ ...f, serviceCharges: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (₹)</label>
                  <input
                    type="number"
                    value={editBillForm.otherCharges}
                    onChange={e => setEditBillForm(f => ({ ...f, otherCharges: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={editBillForm.discountAmount}
                    onChange={e => setEditBillForm(f => ({ ...f, discountAmount: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm text-blue-700 font-medium">Computed Gross Total: ₹{(Number(editBillForm.serviceCharges || 0) + Number(editBillForm.otherCharges || 0) - Number(editBillForm.discountAmount || 0)).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={editBillForm.paymentMode}
                    onChange={e => setEditBillForm(f => ({ ...f, paymentMode: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select Mode</option>
                    {paymentModeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={editBillForm.paymentStatus}
                    onChange={e => setEditBillForm(f => ({ ...f, paymentStatus: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editBillForm.notes}
                  onChange={e => setEditBillForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setEditingBill(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditBillSave} disabled={editBillLoading}>
                {editBillLoading ? 'Saving...' : 'Save Changes'}
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
        open={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  )
}

export default BillingDashboard
