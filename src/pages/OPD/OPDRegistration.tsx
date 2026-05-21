import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Select, Textarea, Button } from '../../components/ui'
import { doctorAPI, opdAPI, patientAPI } from '../../api/endpoints'

interface OPDFormData {
  patientName: string
  age: string
  gender: string
  phone: string
  aadhar: string
  address: string
  doctorId: string
  consultationFee: number
  symptoms: string
  visitDate: string
  tokenNumber: string
  paymentMode: string
  paymentStatus: string
}

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const OPDRegistration = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastRegistration, setLastRegistration] = useState<any>(null)
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string; fee: number }[]>([])
  const [nextToken, setNextToken] = useState<number | null>(null)
  const [existingPatient, setExistingPatient] = useState<any>(null)
  const [searchingAadhar, setSearchingAadhar] = useState(false)

  const [formData, setFormData] = useState<OPDFormData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    aadhar: '',
    address: '',
    doctorId: '',
    consultationFee: 0,
    symptoms: '',
    visitDate: todayStr(),
    tokenNumber: '',
    paymentMode: 'CASH',
    paymentStatus: 'PAID',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof OPDFormData, string>>>({})

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [doctorsRes, tokenRes] = await Promise.all([
          doctorAPI.getAll(),
          opdAPI.getNextToken(),
        ])
        setDoctors((doctorsRes.data.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          specialty: d.specialization,
          fee: Number(d.consultationFee) || 0,
        })))
        setNextToken(tokenRes.data.data?.nextToken || 1)
      } catch (err) {
        console.error('Failed to load initial data:', err)
      }
    }
    fetchInitial()
  }, [])


  const lookupPatientByPhone = useCallback(async (phone: string) => {
    // Validate 10 digit phone number
    if (!/^\d{10}$/.test(phone)) {
      setExistingPatient(null)
      return
    }

    setSearchingAadhar(true) 

    try {
      const res = await patientAPI.getAll({ search: phone })

      const patients = res.data.data?.patients || res.data.data || []

      const found = patients.find((p: any) => p.phone === phone)

      if (found) {
        setExistingPatient(found)

        setFormData(prev => ({
          ...prev,
          patientName: found.name,
          age: String(found.age),
          gender: found.gender,
          phone: found.phone,
          address: found.address || '',
        }))
      } else {
        setExistingPatient(null)
      }
    } catch {
      setExistingPatient(null)
    } finally {
      setSearchingAadhar(false)
    }
  }, [])

  // Auto-fill consultation fee when doctor is selected
  useEffect(() => {
    if (formData.doctorId) {
      const selectedDoctor = doctors.find(d => String(d.id) === String(formData.doctorId))
      if (selectedDoctor) {
        setFormData(prev => ({ ...prev, consultationFee: selectedDoctor.fee }))
      }
    }
  }, [formData.doctorId, doctors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (errors[name as keyof OPDFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Phone lookup when 10 digits entered
    if (name === 'phone' && value.length === 10) {
      lookupPatientByPhone(value)
    } else if (name === 'phone' && value.length < 10) {
      setExistingPatient(null)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof OPDFormData, string>> = {}

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required'
    }

    if (!formData.age || Number(formData.age) <= 0 || Number(formData.age) > 150) {
      newErrors.age = 'Please enter a valid age'
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select gender'
    }

    if (!formData.phone || !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    // if (!formData.aadhar || !/^\d{12}$/.test(formData.aadhar)) {
    //   newErrors.aadhar = 'Please enter a valid 12-digit Aadhar number'
    // }

    if (!formData.doctorId) {
      newErrors.doctorId = 'Please select a doctor'
    }

    if (!formData.visitDate) {
      newErrors.visitDate = 'Please select visit date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Step 1: Create or find patient
      let patientId: string
      if (existingPatient) {
        patientId = existingPatient.id
      } else {
        try {
          const patientRes = await patientAPI.create({
            name: formData.patientName,
            age: formData.age,
            gender: formData.gender.toUpperCase(),
            phone: formData.phone,
            aadhar: formData.aadhar,
            address: formData.address,
          })
          patientId = patientRes.data.data.id
        } catch (patientErr: any) {
          if (patientErr?.response?.status === 409) {
            const listRes = await patientAPI.getAll({ search: formData.aadhar })
            const found = (listRes.data.data?.patients || listRes.data.data || []).find(
              (p: any) => p.aadhar === formData.aadhar
            )
            if (!found) throw new Error('Patient exists but could not be found')
            patientId = found.id
          } else {
            throw patientErr
          }
        }
      }

      // Step 2: Create OPD visit
      const visitRes = await opdAPI.createVisit({
        patientId,
        doctorId: formData.doctorId,
        symptoms: formData.symptoms,
        visitDate: formData.visitDate,
        paymentMode: formData.paymentMode,
      })

      const visitData = visitRes.data.data
      setLastRegistration({
        tokenNumber: visitData.tokenNumber,
        patientName: visitData.patient?.name || formData.patientName,
        patientId,
        doctorId: formData.doctorId,
        doctorName: visitData.doctor?.name || doctors.find(d => d.id === formData.doctorId)?.name || '',
        fee: Number(visitData.fee) || formData.consultationFee,
        paymentStatus: visitData.paymentStatus,
        visitId: visitData.id,
      })
      setShowSuccessModal(true)
    } catch (err: any) {
      console.error('Failed to register OPD visit:', err)
      const msg = err?.response?.data?.message || 'Failed to register OPD visit'
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintSlip = () => {
    if (!lastRegistration?.visitId) return
    navigate(`/opd/slip/${lastRegistration.visitId}`)
  }

  const handleNewRegistration = () => {
    setShowSuccessModal(false)
    setLastRegistration(null)
    setExistingPatient(null)
    setFormData({
      patientName: '',
      age: '',
      gender: '',
      phone: '',
      aadhar: '',
      address: '',
      doctorId: '',
      consultationFee: 0,
      symptoms: '',
      visitDate: todayStr(),
      tokenNumber: '',
      paymentMode: 'CASH',
      paymentStatus: 'PAID',
    })
    // Refresh next token
    opdAPI.getNextToken().then(res => setNextToken(res.data.data?.nextToken || 1)).catch(() => { })
  }

  const selectedDoctor = doctors.find(d => d.id === formData.doctorId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OPD Registration</h1>
          <p className="text-slate-500 mt-1">Register new outpatient consultation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 rounded-xl">
            <span className="text-sm text-slate-500">Next OPD Number: </span>
            <span className="text-sm font-bold text-blue-600">{nextToken ?? '...'}</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/opd')} className='cursor-pointer'>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            View All OPD
          </Button>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl  shadow-sm border border-slate-100 overflow-hidden">
        {/* Patient Information Section */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
            Patient Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Patient Name"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              error={errors.patientName}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                placeholder="Years"
                min={0}
                max={150}
                required
                error={errors.age}
              />
              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                placeholder="Select"
                required
                error={errors.gender}
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </div>
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit number"
              maxLength={10}
              required
              error={errors.phone}
            />
            {searchingAadhar && (
              <div className="lg:col-span-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-600 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Searching for existing patient...
              </div>
            )}
            {existingPatient && !searchingAadhar && (
              <div className="lg:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Existing patient found: <strong>{existingPatient.name}</strong> ({existingPatient.phone}). Details auto-filled. A new OPD visit will be created for this patient.</span>
              </div>
            )}
            <Input
              label="Aadhar Number"
              name="aadhar"
              value={formData.aadhar}
              onChange={handleChange}
              placeholder="12-digit Aadhar number"
              maxLength={12}
              // required
              error={errors.aadhar}
            />

            <div className="lg:col-span-2">
              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete address"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Doctor & Consultation Section */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">2</span>
            Consultation Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Select Doctor"
              name="doctorId"
              value={formData.doctorId}
              onChange={handleChange}
              placeholder="Choose a doctor"
              required
              error={errors.doctorId}
              options={doctors.map(d => ({
                value: d.id,
                label: `${d.name} (${d.specialty})`,
              }))}
            />
            <div>
              <Input
                label="Consultation Fee"
                name="consultationFee"
                type="number"
                value={formData.consultationFee}
                onChange={handleChange}
                // disabled
                className="bg-slate-50 font-semibold text-lg"
              />
              {selectedDoctor && (
                <p className="mt-1.5 text-sm text-slate-500">
                  {selectedDoctor.specialty} • Standard Fee
                </p>
              )}
            </div>
            <Input
              label="Visit Date"
              name="visitDate"
              type="date"
              value={formData.visitDate}
              onChange={handleChange}
              required
              error={errors.visitDate}
            />
            <div className="lg:col-span-3">
              <Textarea
                label="Symptoms / Diagnosis"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Describe patient's symptoms or initial diagnosis"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">3</span>
            Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Payment Mode"
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleChange}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'UPI', label: 'UPI' },
                { value: 'ONLINE', label: 'Online Transfer' },
              ]}
            />
            <Select
              label="Payment Status"
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              options={[
                { value: 'PAID', label: 'Paid' },
                { value: 'PENDING', label: 'Pending' },
              ]}
            />
            <div className="lg:col-span-2 flex items-end">
              <div className="w-full p-4 bg-linear-to-r from-blue-50 to-cyan-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Amount</span>
                  <span className="text-2xl font-bold text-slate-800">₹{formData.consultationFee}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="p-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            All required fields are marked with <span className="text-red-500">*</span>
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleNewRegistration}>
              Clear Form
            </Button>
            <Button type="submit" isLoading={isSubmitting} className='cursor-pointer'>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Register Patient
            </Button>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && lastRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Success Header */}
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Registration Successful!</h3>
              <p className="text-emerald-100 mt-1">Patient has been registered successfully</p>
            </div>

            {/* Registration Details */}
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">OPD Number</span>
                  <span className="font-bold text-blue-600">{String(lastRegistration.tokenNumber).padStart(4, '0')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Patient Name</span>
                  <span className="font-medium text-slate-800">{lastRegistration.patientName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Doctor</span>
                  <span className="font-medium text-slate-800">{lastRegistration.doctorName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-emerald-600">₹{lastRegistration.fee}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${lastRegistration.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                    {lastRegistration.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={handleNewRegistration}>
                New Registration
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={handlePrintSlip} >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OPDRegistration
