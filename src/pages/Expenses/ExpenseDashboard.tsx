import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { ConfirmModal } from '../../components/modal'
import { expenseAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

const paymentModeOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
]

const frequencyOptions = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
]

const paymentModeLabel = (mode: string) =>
  paymentModeOptions.find(m => m.value === mode)?.label || mode

const ExpenseDashboard = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ today: 0, week: 0, month: 0, year: 0, categoryBreakdown: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [viewingExpense, setViewingExpense] = useState<any>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modeFilter, setModeFilter] = useState('')

  // New Expense Form
  const emptyForm = {
    title: '',
    categoryId: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paidTo: '',
    paymentMode: 'CASH',
    description: '',
    isRecurring: false,
    frequency: 'MONTHLY',
  }
  const [newExpense, setNewExpense] = useState(emptyForm)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  const fetchExpenses = async () => {
    try {
      const params: Record<string, any> = { limit: 200 }
      if (searchTerm) params.search = searchTerm
      if (categoryFilter) params.categoryId = categoryFilter
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      const res = await expenseAPI.getAll(params)
      setExpenses(res.data.data.expenses || [])
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await expenseAPI.getCategories()
      setCategories(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await expenseAPI.getStats()
      setStats(res.data.data || { today: 0, week: 0, month: 0, year: 0, categoryBreakdown: [] })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [searchTerm, categoryFilter, dateFrom, dateTo])

  // Client-side filter for payment mode and recurring tab
  const filteredExpenses = expenses.filter(expense => {
    if (activeTab === 'recurring' && !expense.isRecurring) return false
    if (modeFilter && expense.paymentMode !== modeFilter) return false
    return true
  })

  const getCategoryName = (expense: any) => {
    return expense.category?.name || categories.find(c => c.id === expense.categoryId)?.name || 'Unknown'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setShowSuccessModal(true)
  }

  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.categoryId || !newExpense.amount || !newExpense.expenseDate) {
      return alert('Please fill all required fields')
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', newExpense.title)
      formData.append('categoryId', newExpense.categoryId)
      formData.append('amount', newExpense.amount)
      formData.append('expenseDate', newExpense.expenseDate)
      formData.append('paymentMode', newExpense.paymentMode)
      if (newExpense.paidTo) formData.append('paidTo', newExpense.paidTo)
      if (newExpense.description) formData.append('description', newExpense.description)
      formData.append('isRecurring', String(newExpense.isRecurring))
      if (newExpense.isRecurring) formData.append('frequency', newExpense.frequency)
      if (receiptFile) formData.append('receiptFile', receiptFile)
      await expenseAPI.create(formData)
      await Promise.all([fetchExpenses(), fetchStats()])
      setNewExpense(emptyForm)
      setReceiptFile(null)
      setReceiptPreview(null)
      setShowAddModal(false)
      showSuccess('Expense added successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', editingExpense.title)
      formData.append('categoryId', editingExpense.categoryId)
      formData.append('amount', String(editingExpense.amount))
      formData.append('expenseDate', editingExpense.expenseDate?.slice?.(0, 10) || editingExpense.expenseDate)
      formData.append('paymentMode', editingExpense.paymentMode)
      if (editingExpense.paidTo !== undefined) formData.append('paidTo', editingExpense.paidTo || '')
      if (editingExpense.description !== undefined) formData.append('description', editingExpense.description || '')
      formData.append('isRecurring', String(editingExpense.isRecurring))
      if (editingExpense.isRecurring) formData.append('frequency', editingExpense.frequency || 'MONTHLY')
      if (receiptFile) formData.append('receiptFile', receiptFile)
      await expenseAPI.update(editingExpense.id, formData)
      await Promise.all([fetchExpenses(), fetchStats()])
      setEditingExpense(null)
      setReceiptFile(null)
      setReceiptPreview(null)
      showSuccess('Expense updated successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteId) return
    try {
      await expenseAPI.delete(deleteId)
      await Promise.all([fetchExpenses(), fetchStats()])
      setDeleteId(null)
      showSuccess('Expense deleted successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expense Management</h1>
          <p className="text-slate-500">Track and manage all hospital expenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Today's Expenses</p>
              <p className="text-2xl font-bold text-slate-800">₹{Number(stats.today).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Week</p>
              <p className="text-2xl font-bold text-slate-800">₹{Number(stats.week).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-2xl font-bold text-slate-800">₹{Number(stats.month).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Year</p>
              <p className="text-2xl font-bold text-slate-800">₹{Number(stats.year).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {stats.categoryBreakdown?.length > 0 ? (
              stats.categoryBreakdown
                .filter((cat: any) => cat.total > 0)
                .sort((a: any, b: any) => b.total - a.total)
                .map((cat: any) => (
                  <div key={cat.categoryId} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {cat.category?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-700">{cat.category}</span>
                        <span className="font-semibold text-slate-800">₹{Number(cat.total).toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${stats.month > 0 ? (Number(cat.total) / Number(stats.month)) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 w-16 text-right">
                      {stats.month > 0 ? ((Number(cat.total) / Number(stats.month)) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-center text-slate-500 py-4">No expense data yet</p>
            )}
          </div>
        </div>

        {/* Recurring Expenses Due */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recurring Expenses</h3>
          <div className="space-y-3">
            {expenses.filter(e => e.isRecurring).slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                  {getCategoryName(expense).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{expense.title}</p>
                  <p className="text-xs text-slate-500">{expense.frequency}</p>
                </div>
                <span className="text-sm font-semibold text-slate-800">₹{Number(expense.amount).toLocaleString()}</span>
              </div>
            ))}
            {expenses.filter(e => e.isRecurring).length === 0 && (
              <p className="text-center text-slate-500 py-4">No recurring expenses</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'recurring'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Recurring ({expenses.filter(e => e.isRecurring).length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
            />
            <Select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Modes' },
                ...paymentModeOptions,
              ]}
            />
          </div>
        </div>

        {/* Expense Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Title</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Paid To</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Mode</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Added By</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(expense => {
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(expense.expenseDate)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{expense.title}</span>
                        {expense.isRecurring && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                            {expense.frequency}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{getCategoryName(expense)}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">₹{Number(expense.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{expense.paidTo || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                        {paymentModeLabel(expense.paymentMode)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {expense.creator?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingExpense(expense)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => setEditingExpense({
                              ...expense,
                              amount: Number(expense.amount),
                              expenseDate: expense.expenseDate?.slice?.(0, 10) || expense.expenseDate,
                            })}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteId(expense.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
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
                )
              })}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-500">No expenses found</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </span>
            <span className="font-semibold text-slate-800">
              Total: ₹{filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Add New Expense</h3>
              <button onClick={() => { setShowAddModal(false); setReceiptFile(null); setReceiptPreview(null) }} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Title *</label>
                <Input
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="e.g., Electricity Bill - March"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <Select
                    value={newExpense.categoryId}
                    onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                    options={[
                      { value: '', label: 'Select Category' },
                      ...categories.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date *</label>
                  <Input
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                  <Select
                    value={newExpense.paymentMode}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                    options={paymentModeOptions}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid To</label>
                <Input
                  value={newExpense.paidTo}
                  onChange={(e) => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                  placeholder="Vendor/Payee name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={2}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt/Bill</label>
                <input
                  type="file"
                  id="receipt-upload"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setReceiptFile(file)
                    if (file && file.type.startsWith('image/')) {
                      setReceiptPreview(URL.createObjectURL(file))
                    } else {
                      setReceiptPreview(null)
                    }
                  }}
                />
                {receiptFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{receiptFile.name}</p>
                      <p className="text-xs text-slate-500">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="receipt-upload"
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors cursor-pointer block"
                  >
                    <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-sm text-slate-500">Click to upload receipt</p>
                    <p className="text-xs text-slate-400">JPG, PNG up to 5MB</p>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExpense.isRecurring}
                    onChange={(e) => setNewExpense({ ...newExpense, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Recurring Expense</span>
                </label>
                {newExpense.isRecurring && (
                  <Select
                    value={newExpense.frequency}
                    onChange={(e) => setNewExpense({ ...newExpense, frequency: e.target.value })}
                    options={frequencyOptions}
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); setReceiptFile(null); setReceiptPreview(null) }}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddExpense} disabled={saving}>
                {saving ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Adding...</>
                ) : 'Add Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Expense</h3>
              <button onClick={() => { setEditingExpense(null); setReceiptFile(null); setReceiptPreview(null) }} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Title *</label>
                <Input
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <Select
                    value={editingExpense.categoryId}
                    onChange={(e) => setEditingExpense({ ...editingExpense, categoryId: e.target.value })}
                    options={[
                      { value: '', label: 'Select Category' },
                      ...categories.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <Input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date *</label>
                  <Input
                    type="date"
                    value={editingExpense.expenseDate}
                    onChange={(e) => setEditingExpense({ ...editingExpense, expenseDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                  <Select
                    value={editingExpense.paymentMode}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMode: e.target.value })}
                    options={paymentModeOptions}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid To</label>
                <Input
                  value={editingExpense.paidTo}
                  onChange={(e) => setEditingExpense({ ...editingExpense, paidTo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={2}
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt/Bill</label>
                <input
                  type="file"
                  id="receipt-upload-edit"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setReceiptFile(file)
                    if (file && file.type.startsWith('image/')) {
                      setReceiptPreview(URL.createObjectURL(file))
                    } else {
                      setReceiptPreview(null)
                    }
                  }}
                />
                {receiptFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{receiptFile.name}</p>
                      <p className="text-xs text-slate-500">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : editingExpense.receiptFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">Receipt uploaded</p>
                      <button type="button" onClick={() => window.open(editingExpense.receiptFile, '_blank')} className="text-xs text-blue-600 hover:underline">View current receipt</button>
                    </div>
                    <label htmlFor="receipt-upload-edit" className="text-xs text-blue-600 hover:underline cursor-pointer">Replace</label>
                  </div>
                ) : (
                  <label
                    htmlFor="receipt-upload-edit"
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors cursor-pointer block"
                  >
                    <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-sm text-slate-500">Click to upload receipt</p>
                    <p className="text-xs text-slate-400">PDF, JPG, PNG up to 5MB</p>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingExpense.isRecurring}
                    onChange={(e) => setEditingExpense({ ...editingExpense, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Recurring Expense</span>
                </label>
                {editingExpense.isRecurring && (
                  <Select
                    value={editingExpense.frequency || 'MONTHLY'}
                    onChange={(e) => setEditingExpense({ ...editingExpense, frequency: e.target.value })}
                    options={frequencyOptions}
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => { setEditingExpense(null); setReceiptFile(null); setReceiptPreview(null) }}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdateExpense} disabled={saving}>
                {saving ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</>
                ) : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Expense Details</h3>
              <button onClick={() => setViewingExpense(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl text-blue-600 font-bold">
                  {getCategoryName(viewingExpense).charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-800">{viewingExpense.title}</h4>
                  <p className="text-slate-500">{getCategoryName(viewingExpense)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-3xl font-bold text-slate-800">₹{Number(viewingExpense.amount).toLocaleString()}</p>
                {viewingExpense.isRecurring && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                    {viewingExpense.frequency} recurring
                  </span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">{formatDate(viewingExpense.expenseDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid To</span>
                  <span className="font-medium text-slate-800">{viewingExpense.paidTo || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode</span>
                  <span className="font-medium text-slate-800">{paymentModeLabel(viewingExpense.paymentMode)}</span>
                </div>
                {viewingExpense.description && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-slate-500 mb-1">Description</p>
                    <p className="text-slate-800">{viewingExpense.description}</p>
                  </div>
                )}
                {viewingExpense.receiptFile && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-slate-500 mb-2">Receipt</p>
                    <Button variant="outline" className="w-full" onClick={() => window.open(viewingExpense.receiptFile, '_blank')}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Receipt
                    </Button>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Added By</span>
                  <span className="font-medium text-slate-800">{viewingExpense.creator?.name || '-'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setViewingExpense(null)}>Close</Button>
              <Button className="flex-1" onClick={() => {
                setEditingExpense({
                  ...viewingExpense,
                  amount: Number(viewingExpense.amount),
                  expenseDate: viewingExpense.expenseDate?.slice?.(0, 10) || viewingExpense.expenseDate,
                })
                setViewingExpense(null)
              }}>Edit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteId(null)}
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Success!</h3>
            <p className="text-slate-500 mb-6">{successMessage}</p>
            <Button className="w-full" onClick={() => setShowSuccessModal(false)}>OK</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseDashboard
