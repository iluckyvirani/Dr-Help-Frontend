import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Input, Select, Textarea } from '../../components/ui'
import { prescriptionAPI, patientAPI, doctorAPI } from '../../api/endpoints'

interface MedicineRow {
  medicineName: string
  dosage: string
  form: string
  quantity: string
  frequency: string
  days: string
  instructions: string
}

const emptyMedicine: MedicineRow = {
  medicineName: '',
  dosage: '',
  form: 'Tablet',
  quantity: '',
  frequency: '',
  days: '',
  instructions: '',
}

const formOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Ointment', 'Inhaler']
const frequencyOptions = ['Once a day', 'Twice a day', '3 times a day', '4 times a day', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Before meals', 'After meals', 'Stat']

const AddPrescription = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Accept patient info from location.state or URL params
  const stateData = location.state as any
  const patientIdParam = searchParams.get('patientId') || stateData?.patientId || ''
  const opdVisitIdParam = searchParams.get('opdVisitId') || stateData?.opdVisitId || ''
  const admissionIdParam = searchParams.get('admissionId') || stateData?.admissionId || ''
  const patientNameParam = stateData?.patientName || ''

  const [patientId, setPatientId] = useState(patientIdParam)
  const [opdVisitId] = useState(opdVisitIdParam)
  const [admissionId] = useState(admissionIdParam)
  const [notes, setNotes] = useState('')
  const [medicines, setMedicines] = useState<MedicineRow[]>([{ ...emptyMedicine }])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Patient search
  const [patientSearch, setPatientSearch] = useState(patientNameParam)
  const [patientResults, setPatientResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(stateData?.patient || null)
  const [searching, setSearching] = useState(false)

  // Doctor info (to show who is prescribing)
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState('')

  useEffect(() => {
    // Load doctors for lookup
    doctorAPI.getAll().then(res => {
      setDoctors(res.data.data?.doctors || res.data.data || [])
    }).catch(() => {})

    // If patientId provided, fetch patient details
    if (patientIdParam) {
      patientAPI.getById(patientIdParam).then(res => {
        setSelectedPatient(res.data.data)
        setPatientSearch(res.data.data.name)
      }).catch(() => {})
    }
  }, [patientIdParam])

  // Search patients by name/phone
  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2 || selectedPatient) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await patientAPI.getAll({ search: patientSearch, limit: 5 })
        setPatientResults(res.data.data?.patients || res.data.data || [])
      } catch {
        setPatientResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [patientSearch, selectedPatient])

  const handleSelectPatient = (p: any) => {
    setSelectedPatient(p)
    setPatientId(p.id)
    setPatientSearch(p.name)
    setPatientResults([])
  }

  const clearPatient = () => {
    setSelectedPatient(null)
    setPatientId('')
    setPatientSearch('')
    setPatientResults([])
  }

  const updateMedicine = (index: number, field: keyof MedicineRow, value: string) => {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const addMedicineRow = () => {
    setMedicines(prev => [...prev, { ...emptyMedicine }])
  }

  const removeMedicineRow = (index: number) => {
    if (medicines.length === 1) return
    setMedicines(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!patientId) return alert('Please select a patient')
    if (medicines.some(m => !m.medicineName || !m.dosage || !m.quantity || !m.frequency || !m.days)) {
      return alert('Please fill all required medicine fields')
    }

    setSubmitting(true)
    try {
      await prescriptionAPI.create({
        patientId,
        ...(opdVisitId && { opdVisitId }),
        ...(admissionId && { admissionId }),
        ...(selectedDoctor && { prescribedBy: selectedDoctor }),
        notes: notes || undefined,
        medicines: medicines.map(m => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          form: m.form,
          quantity: parseInt(m.quantity),
          frequency: m.frequency,
          days: parseInt(m.days),
          instructions: m.instructions || undefined,
        })),
      })
      setShowSuccess(true)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Prescription</h1>
          <p className="text-slate-500">Create a new prescription for a patient</p>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Patient Information</h2>

        {selectedPatient ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                {selectedPatient.name?.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{selectedPatient.name}</p>
                <p className="text-sm text-slate-500">
                  {selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.phone}
                </p>
              </div>
            </div>
            {!patientIdParam && (
              <button onClick={clearPatient} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Change
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Input
              label="Search Patient"
              placeholder="Search by name or phone..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {searching && (
              <div className="absolute right-3 top-9">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            {patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.age} yrs • {p.gender} • {p.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Context info */}
        {(opdVisitId || admissionId) && (
          <div className="mt-3 flex gap-3">
            {opdVisitId && (
              <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Linked to OPD Visit
              </span>
            )}
            {admissionId && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-200">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Linked to IPD Admission
              </span>
            )}
          </div>
        )}
      </div>

      {/* Medicines */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Medicines</h2>
          <Button size="sm" variant="outline" onClick={addMedicineRow}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Medicine
          </Button>
        </div>

        <div className="space-y-4">
          {medicines.map((med, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-4 relative">
              {medicines.length > 1 && (
                <button
                  onClick={() => removeMedicineRow(index)}
                  className="absolute top-3 right-3 p-1 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg">#{index + 1}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Medicine Name *"
                  placeholder="e.g., Paracetamol"
                  value={med.medicineName}
                  onChange={(e) => updateMedicine(index, 'medicineName', e.target.value)}
                />
                <Input
                  label="Dosage *"
                  placeholder="e.g., 500mg"
                  value={med.dosage}
                  onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                />
                <Select
                  label="Form *"
                  value={med.form}
                  onChange={(e) => updateMedicine(index, 'form', e.target.value)}
                  options={formOptions.map(f => ({ label: f, value: f }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                <Input
                  label="Quantity *"
                  type="number"
                  placeholder="e.g., 10"
                  value={med.quantity}
                  onChange={(e) => updateMedicine(index, 'quantity', e.target.value)}
                />
                <Select
                  label="Frequency *"
                  value={med.frequency}
                  onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                  options={[{ label: 'Select frequency', value: '' }, ...frequencyOptions.map(f => ({ label: f, value: f }))]}
                />
                <Input
                  label="Days *"
                  type="number"
                  placeholder="e.g., 7"
                  value={med.days}
                  onChange={(e) => updateMedicine(index, 'days', e.target.value)}
                />
                <Input
                  label="Instructions"
                  placeholder="e.g., After food"
                  value={med.instructions}
                  onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Additional Notes</h2>
        <Textarea
          placeholder="Any additional notes or instructions for the patient..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Doctor Selection (for SUPER_ADMIN — doctors auto-use their own ID from backend) */}
      {doctors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Prescribing Doctor</h2>
          <Select
            label="Select Doctor (optional — defaults to logged-in user)"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            options={[
              { label: 'Current logged-in doctor', value: '' },
              ...doctors.map((d: any) => ({ label: `Dr. ${d.name} — ${d.specialization}`, value: d.userId || d.id }))
            ]}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting || !patientId}>
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create Prescription
            </>
          )}
        </Button>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Prescription Created!</h3>
            <p className="text-slate-500 mb-6">
              Prescription for <span className="font-semibold">{selectedPatient?.name}</span> has been created successfully with {medicines.length} medicine(s).
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSuccess(false)
                  setMedicines([{ ...emptyMedicine }])
                  setNotes('')
                  if (!patientIdParam) clearPatient()
                }}
              >
                Add Another
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (patientId) navigate(`/patients/${patientId}`)
                  else navigate(-1)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddPrescription
