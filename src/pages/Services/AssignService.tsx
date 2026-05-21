import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Textarea } from '../../components/ui'
import { patientAPI, serviceAPI } from '../../api/endpoints'

interface SelectedService {
  id: string
  name: string
  fee: number
  quantity: number
}

const AssignService = () => {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<any[]>([])
  const [availableServices, setAvailableServices] = useState<any[]>([])
  const [, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [notes, setNotes] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [searchService, setSearchService] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, servicesRes] = await Promise.all([
          patientAPI.getAll(),
          serviceAPI.getAll()
        ])
        const pts = patientsRes.data.data?.patients || patientsRes.data.data || []
        setPatients(pts)
        const svcs = servicesRes.data.data?.services || servicesRes.data.data || []
        setAvailableServices(svcs)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get selected patient details
  const patientDetails = patients.find(p => p.id === selectedPatient)

  // Service helpers
  const getServiceName = (s: any) => s?.name || s?.serviceName || ''
  const getServiceFee = (s: any) => Number(s?.fee || s?.price || 0)
  const getServiceCategory = (s: any) => s?.category?.name || s?.categoryName || ''

  // Filter services based on search
  const filteredServices = availableServices.filter(s =>
    getServiceName(s).toLowerCase().includes(searchService.toLowerCase())
  )

  // Calculate total
  const totalAmount = selectedServices.reduce((sum, s) => sum + (s.fee * s.quantity), 0)

  const handleAddService = (service: any) => {
    const sId = service.id
    const existing = selectedServices.find(s => s.id === sId)
    if (existing) {
      setSelectedServices(selectedServices.map(s => 
        s.id === sId ? { ...s, quantity: s.quantity + 1 } : s
      ))
    } else {
      setSelectedServices([...selectedServices, { 
        id: sId, 
        name: getServiceName(service), 
        fee: getServiceFee(service), 
        quantity: 1 
      }])
    }
    setSearchService('')
  }

  const handleRemoveService = (id: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== id))
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveService(id)
      return
    }
    setSelectedServices(selectedServices.map(s => 
      s.id === id ? { ...s, quantity } : s
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient || selectedServices.length === 0) {
      alert('Please select a patient and at least one service')
      return
    }
    try {
      await serviceAPI.assign({
        patientId: selectedPatient,
        serviceDate,
        services: selectedServices.map(s => ({ id: s.id, quantity: s.quantity, fee: s.fee })),
        notes: notes || undefined,
      })
      setShowSuccessModal(true)
    } catch (err: any) {
      console.error('Failed to assign services:', err)
      alert(err.response?.data?.message || 'Failed to assign services')
    }
  }

  const handleReset = () => {
    setSelectedPatient('')
    setServiceDate(new Date().toISOString().split('T')[0])
    setSelectedServices([])
    setNotes('')
    setShowSuccessModal(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      diagnostic: 'bg-blue-100 text-blue-700',
      nursing: 'bg-emerald-100 text-emerald-700',
      therapy: 'bg-purple-100 text-purple-700',
      procedure: 'bg-amber-100 text-amber-700',
    }
    return colors[category] || 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assign Services</h1>
          <p className="text-slate-500 mt-1">Assign services to patients</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/services')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Services
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {/* Patient Selection */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Patient</h3>
              <Select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                placeholder="Select patient"
                options={[
                  { value: '', label: 'Select Patient' },
                  ...patients.map(p => ({ 
                    value: p.id, 
                    label: `${p.name} (${p.patientId || p.id?.slice(-8)})` 
                  }))
                ]}
                required
              />

              {/* Patient Details Card */}
              {patientDetails && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {patientDetails.name?.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{patientDetails.name}</p>
                      <p className="text-sm text-slate-500">
                        {patientDetails.phone} • {patientDetails.gender}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Patient ID</p>
                      <p className="text-sm font-mono text-purple-600">{patientDetails.patientId || patientDetails.id?.slice(-8)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Date */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Service Date</h3>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Service Selection */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Services</h3>
              
              {/* Search Services */}
              <div className="relative mb-4">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search services to add..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Service List */}
              {searchService && (
                <div className="mb-4 max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {filteredServices.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500 text-center">No services found</p>
                  ) : (
                    filteredServices.map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleAddService(service)}
                        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(getServiceCategory(service))}`}>
                            {getServiceCategory(service) || 'General'}
                          </span>
                          <span className="text-sm font-medium text-slate-700">{getServiceName(service)}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">₹{getServiceFee(service)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Quick Add Buttons */}
              {!searchService && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {availableServices.slice(0, 6).map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleAddService(service)}
                      className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      + {getServiceName(service)}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Services */}
              {selectedServices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase">Selected Services</p>
                  <div className="space-y-2">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{service.name}</p>
                          <p className="text-sm text-slate-500">₹{service.fee} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(service.id, service.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center font-semibold text-slate-800">{service.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(service.id, service.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        <div className="w-20 text-right">
                          <p className="font-semibold text-slate-800">₹{service.fee * service.quantity}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(service.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Notes (Optional)</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the services..."
                rows={3}
              />
            </div>

            {/* Total & Submit */}
            <div className="p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold text-purple-600">₹{totalAmount.toLocaleString()}</span>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedPatient || selectedServices.length === 0}>
                Assign Services
              </Button>
            </div>
          </form>
        </div>

        {/* Patient List Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Patients</h3>
              <p className="text-sm text-slate-500">{patients.length} registered patients</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {patients.slice(0, 10).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatient(p.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${selectedPatient === p.id ? 'bg-purple-50' : ''}`}
                >
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.phone} • {p.patientId || p.id?.slice(-8)}</p>
                </button>
              ))}
              {patients.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">No patients registered</div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-linear-to-br from-purple-500 to-blue-500 rounded-xl p-4 text-white">
            <h4 className="font-semibold mb-3">Today's Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-100">Services Assigned</span>
                <span className="font-semibold">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-100">Patients Served</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-100">Total Revenue</span>
                <span className="font-semibold">₹8,450</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && patientDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-linear-to-r from-purple-500 to-blue-500 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Services Assigned!</h3>
              <p className="text-purple-100">Services have been added to patient's bill</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {patientDetails?.name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{patientDetails?.name}</p>
                    <p className="text-xs text-slate-500">{patientDetails?.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Date</p>
                    <p className="font-medium text-slate-800">{formatDate(serviceDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Services</p>
                    <p className="font-medium text-slate-800">{selectedServices.length} items</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{service.name} × {service.quantity}</span>
                    <span className="font-medium text-slate-800">₹{service.fee * service.quantity}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-purple-600">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/ipd')}>
                Back to IPD
              </Button>
              <Button className="flex-1" onClick={handleReset}>
                Assign More
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignService
