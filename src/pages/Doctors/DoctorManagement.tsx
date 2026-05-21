import { useState, useEffect } from 'react'
import { Button, Badge, Input, Select } from '../../components/ui'
import { ConfirmModal, SuccessModal } from '../../components/modal'
import { doctorAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

const specializations = [
  'General Physician',
  'Cardiologist',
  'Orthopedic',
  'Pediatrician',
  'ENT Specialist',
  'Dermatologist',
  'Neurologist',
  'Gynecologist',
  'Ophthalmologist',
  'Psychiatrist',
  'Psychologist',
]

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dayMap: Record<string, string> = {
  Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY', Thu: 'THURSDAY',
  Fri: 'FRIDAY', Sat: 'SATURDAY', Sun: 'SUNDAY',
}
const dayMapReverse: Record<string, string> = Object.fromEntries(
  Object.entries(dayMap).map(([k, v]) => [v, k])
)

interface DoctorDay {
  id: string
  doctorId: string
  day: string
}

interface Doctor {
  id: string
  name: string
  specialization: string
  qualification: string
  phone: string
  email: string
  photo?: string | null
  availableDays: DoctorDay[]
  timingFrom: string
  timingTo: string
  consultationFee: string | number
  opdLimitPerDay: number
  status: string
  createdAt: string
  updatedAt: string
}

const DoctorManagement = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null)
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false, title: '', message: '',
  })
  const [formErrors, setFormErrors] = useState<{ phone?: string; email?: string }>({})

  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    qualification: '',
    phone: '',
    email: '',
    availableDays: [] as string[],
    timingFrom: '09:00',
    timingTo: '17:00',
    consultationFee: '',
    opdLimit: '',
    status: 'ACTIVE',
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchDoctors()
  }, [debouncedSearch])

  const fetchDoctors = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {}
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const res = await doctorAPI.getAll(params)
      setDoctors(res.data.data || [])
    } catch (err) {
      console.error('Failed to load doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const totalDoctors = doctors.length
  const activeDoctors = doctors.filter(d => d.status === 'ACTIVE').length
  const avgFee = totalDoctors ? Math.round(doctors.reduce((sum, d) => sum + Number(d.consultationFee || 0), 0) / totalDoctors) : 0

  const filteredDoctors = doctors.filter(doctor => {
    const matchesStatus = !filterStatus || doctor.status === filterStatus
    return matchesStatus
  })

  const handleOpenModal = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor)
      setFormData({
        name: doctor.name,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        phone: doctor.phone,
        email: doctor.email,
        availableDays: doctor.availableDays.map(d => dayMapReverse[d.day] || d.day),
        timingFrom: doctor.timingFrom,
        timingTo: doctor.timingTo,
        consultationFee: String(doctor.consultationFee),
        opdLimit: String(doctor.opdLimitPerDay),
        status: doctor.status,
      })
    } else {
      setEditingDoctor(null)
      setFormData({
        name: '',
        specialization: '',
        qualification: '',
        phone: '',
        email: '',
        availableDays: [],
        timingFrom: '09:00',
        timingTo: '17:00',
        consultationFee: '',
        opdLimit: '30',
        status: 'ACTIVE',
      })
    }
    setShowModal(true)
  }

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: { phone?: string; email?: string } = {}
    if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const payload = new FormData()
    payload.append('name', formData.name)
    payload.append('specialization', formData.specialization)
    payload.append('qualification', formData.qualification)
    payload.append('phone', formData.phone)
    payload.append('email', formData.email)
    payload.append('availableDays', JSON.stringify(formData.availableDays.map(d => dayMap[d] || d)))
    payload.append('timingFrom', formData.timingFrom)
    payload.append('timingTo', formData.timingTo)
    payload.append('consultationFee', formData.consultationFee)
    payload.append('opdLimitPerDay', formData.opdLimit)
    payload.append('status', formData.status)

    try {
      setSubmitting(true)
      const isEdit = !!editingDoctor
      if (isEdit) {
        await doctorAPI.update(String(editingDoctor.id), payload)
      } else {
        await doctorAPI.create(payload)
      }
      await fetchDoctors()
      setShowModal(false)
      setEditingDoctor(null)
      setSuccessModal({
        open: true,
        title: isEdit ? 'Doctor Updated' : 'Doctor Added',
        message: isEdit ? 'Doctor profile has been updated successfully.' : 'New doctor has been added successfully.',
      })
    } catch (err) {
      console.error('Failed to save doctor:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').slice(1).map(n => n[0]).join('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Management</h1>
          <p className="text-slate-500 mt-1">Manage doctor profiles and schedules</p>
        </div>
        <Button onClick={() => handleOpenModal()} className='cursor-pointer'>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Doctor
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
              <p className="text-sm text-slate-500">Total Doctors</p>
              <p className="text-xl font-bold text-slate-800">{totalDoctors}</p>
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
              <p className="text-sm text-slate-500">Active Today</p>
              <p className="text-xl font-bold text-emerald-600">{activeDoctors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Specializations</p>
              <p className="text-xl font-bold text-purple-600">{new Set(doctors.map(d => d.specialization)).size}</p>
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
              <p className="text-xl font-bold text-amber-600">₹{avgFee}</p>
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
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-1">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="All Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-10 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(doctor.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate">{doctor.name}</h3>
                      <Badge variant={doctor.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                        {doctor.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{doctor.specialization}</p>
                    <p className="text-xs text-slate-400">{doctor.qualification}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate-600">{doctor.timingFrom} - {doctor.timingTo}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    {weekDays.map(day => {
                      const isAvailable = doctor.availableDays.some(d => d.day === dayMap[day])
                      return (
                        <span
                          key={day}
                          className={`px-1.5 py-0.5 rounded text-xs ${isAvailable
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                          {day}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Consultation Fee</p>
                    <p className="font-bold text-emerald-600">₹{Number(doctor.consultationFee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">OPD Limit/Day</p>
                    <p className="font-bold text-slate-800">{doctor.opdLimitPerDay}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isSuperAdmin && (
                <div className="p-3 bg-slate-50 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 cursor-pointer" onClick={() => handleOpenModal(doctor)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(doctor)} className='cursor-pointer'>
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Dr. Full Name"
                  required
                />
                <Select
                  label="Specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  placeholder="Select specialization"
                  options={specializations.map(s => ({ value: s, label: s }))}
                  required
                />
                <Input
                  label="Qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                  placeholder="MBBS, MD, etc."
                  required
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setFormData(prev => ({ ...prev, phone: val }))
                    if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }))
                  }}
                  placeholder="10 digit phone number"
                  error={formErrors.phone}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  placeholder="email@example.com"
                  error={formErrors.email}
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Days <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.availableDays.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Timing From"
                  type="time"
                  value={formData.timingFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, timingFrom: e.target.value }))}
                  required
                />
                <Input
                  label="Timing To"
                  type="time"
                  value={formData.timingTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, timingTo: e.target.value }))}
                  required
                />
              </div>

              {/* Fee & Limit */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Consultation Fee (₹)"
                  type="number"
                  value={formData.consultationFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultationFee: e.target.value }))}
                  placeholder="300"
                  required
                />
                <Input
                  label="OPD Limit/Day"
                  type="number"
                  value={formData.opdLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, opdLimit: e.target.value }))}
                  placeholder="30"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (editingDoctor ? 'Updating...' : 'Adding...') : (editingDoctor ? 'Update Doctor' : 'Add Doctor')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Doctor"
        message={`Are you sure you want to delete ${deleteTarget?.name || 'this doctor'}? This action cannot be undone.`}
        onConfirm={async () => {
          try {
            await doctorAPI.delete(deleteTarget!.id)
            await fetchDoctors()
            setDeleteTarget(null)
            setSuccessModal({
              open: true,
              title: 'Doctor Deleted',
              message: 'Doctor has been deleted successfully.',
            })
          } catch (err) {
            console.error('Failed to delete doctor:', err)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}

export default DoctorManagement
