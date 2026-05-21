import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Input, Select, Textarea } from '../../components/ui'
import { serviceAPI } from '../../api/endpoints'
import ConfirmModal from '../../components/modal/ConfirmModal'
import SuccessModal from '../../components/modal/SuccessModal'
import { useAppSelector } from '../../hooks/useRedux'

interface ServiceCategory {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  description: string | null
  categoryId: string
  category: ServiceCategory
  fee: number | string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

const ServiceList = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    fee: '',
    status: 'ACTIVE'
  })

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => Promise<void> }>({
    open: false, title: '', message: '', onConfirm: async () => { }
  })
  const [successModal, setSuccessModal] = useState({ open: false, message: '' })

  const showSuccess = (msg: string) => setSuccessModal({ open: true, message: msg })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchData = async () => {
    try {
      const params: Record<string, any> = {}
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (categoryFilter) params.categoryId = categoryFilter
      if (statusFilter) params.status = statusFilter
      const [servicesRes, catRes] = await Promise.all([
        serviceAPI.getAll(params),
        serviceAPI.getCategories(),
      ])
      setServices(servicesRes.data.data || [])
      setCategories(catRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch services:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [debouncedSearch, categoryFilter, statusFilter])

  // Stats
  const totalServices = services.length
  const activeServices = services.filter(s => s.status === 'ACTIVE').length
  const inactiveServices = services.filter(s => s.status === 'INACTIVE').length
  const avgFee = totalServices > 0 ? Math.round(services.reduce((sum, s) => sum + Number(s.fee), 0) / totalServices) : 0

  // Filter services (API handles search, category, status)
  const filteredServices = services

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || '',
        categoryId: service.categoryId,
        fee: String(Number(service.fee)),
        status: service.status
      })
    } else {
      setEditingService(null)
      setFormData({ name: '', description: '', categoryId: '', fee: '', status: 'ACTIVE' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({ name: '', description: '', categoryId: '', fee: '', status: 'ACTIVE' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || undefined,
        fee: Number(formData.fee),
        status: formData.status,
      }
      if (editingService) {
        await serviceAPI.update(editingService.id, payload)
        showSuccess('Service updated successfully!')
      } else {
        await serviceAPI.create(payload)
        showSuccess('Service added successfully!')
      }
      await fetchData()
      handleCloseModal()
    } catch (err: any) {
      console.error('Failed to save service:', err)
      alert(err?.response?.data?.message || 'Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (service: Service) => {
    setConfirmModal({
      open: true,
      title: 'Delete Service',
      message: `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        await serviceAPI.delete(service.id)
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess('Service deleted successfully!')
        fetchData()
      }
    })
  }

  const handleToggleStatus = (service: Service) => {
    const newStatus = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setConfirmModal({
      open: true,
      title: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Service`,
      message: `Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} "${service.name}"?`,
      onConfirm: async () => {
        await serviceAPI.update(service.id, { status: newStatus })
        setConfirmModal(prev => ({ ...prev, open: false }))
        showSuccess(`Service ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!`)
        fetchData()
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Services Management</h1>
          <p className="text-slate-500 mt-1">Manage hospital services and fees</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/services/assign')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Assign to Patient
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Service
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Services</p>
              <p className="text-xl font-bold text-slate-800">{totalServices}</p>
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
              <p className="text-sm text-slate-500">Active Services</p>
              <p className="text-xl font-bold text-emerald-600">{activeServices}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Inactive Services</p>
              <p className="text-xl font-bold text-red-600">{inactiveServices}</p>
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
              <p className="text-sm text-slate-500">Avg. Fee</p>
              <p className="text-xl font-bold text-amber-600">₹{avgFee.toLocaleString()}</p>
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
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
              className="w-44"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <p className="text-slate-500">No services found</p>
                      <Button size="sm" onClick={() => handleOpenModal()}>
                        Add Service
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{service.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{service.description || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                        {service.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">₹{Number(service.fee).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleStatus(service)} className="group">
                        <Badge variant={service.status === 'ACTIVE' ? 'success' : 'default'}>
                          {service.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleOpenModal(service)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(service)}
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
        {filteredServices.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium">{filteredServices.length}</span> of <span className="font-medium">{services.length}</span> services
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input
                label="Service Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Blood Sugar Test"
                required
              />

              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the service"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...categories.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  required
                />

                <Input
                  label="Fee (₹)"
                  type="number"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                </Button>
              </div>
            </form>
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

export default ServiceList
