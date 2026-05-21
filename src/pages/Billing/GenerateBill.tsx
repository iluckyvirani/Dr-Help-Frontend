import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, Select } from '../../components/ui'
import { patientAPI, billingAPI } from '../../api/endpoints'
import { printBillDocument } from '../../utils/printBill'

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

const GenerateBill = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [patients, setPatients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientServices, setPatientServices] = useState<any[]>([])
  const [patientDeposits, setPatientDeposits] = useState<any[]>([])
  const [existingBill, setExistingBill] = useState<any>(null)
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [otherChargesAmount, setOtherChargesAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [generatedBill, setGeneratedBill] = useState<any>(null)

  useEffect(() => {
    const fetchPatients = async () => {
      setInitialLoading(true)
      try {
        const res = await patientAPI.getAll({ limit: 500 })
        setPatients(res.data.data.patients || res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch patients:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchPatients()
  }, [])

  useEffect(() => {
    if (initialSearch && patients.length > 0) {
      handleSearch()
    }
  }, [patients])

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    setSelectedPatient(null)
    setPatientServices([])
    setPatientDeposits([])
    setExistingBill(null)
    const q = searchTerm.toLowerCase()
    const results = patients.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.phone?.includes(searchTerm) ||
      p.id?.toLowerCase().includes(q) ||
      p.patientId?.toLowerCase().includes(q)
    )
    setTimeout(() => {
      setSearchResults(results)
      setSearching(false)
      setHasSearched(true)
    }, 300)
  }

  const selectPatient = async (patient: any) => {
    setSelectedPatient(patient)
    setSearchResults([])
    setFetchingDetails(true)
    try {
      const [svcRes, payRes] = await Promise.all([
        patientAPI.getServiceHistory(patient.id),
        patientAPI.getPaymentHistory(patient.id),
      ])
      const services = svcRes.data.data || []
      const payData = payRes.data.data || {}
      const deposits = payData.deposits || []
      const bills = payData.finalBills || []
      setPatientServices(services)
      setPatientDeposits(deposits)
      // Use most recent bill if any
      setExistingBill(bills.length > 0 ? bills[bills.length - 1] : null)
      if (bills.length > 0) {
        const b = bills[bills.length - 1]
        setOtherChargesAmount(String(Number(b.otherCharges || 0)))
        setDiscountAmount(String(Number(b.discountAmount || 0)))
      } else {
        setOtherChargesAmount('')
        setDiscountAmount('')
      }
    } catch (err) {
      console.error('Failed to fetch patient details:', err)
      alert('Failed to load patient details')
    } finally {
      setFetchingDetails(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const calculateBill = () => {
    const serviceTotal = patientServices.reduce((sum, s) => sum + Number(s.totalFee || 0), 0)
    const otherTotal = parseFloat(otherChargesAmount) || 0
    const discount = parseFloat(discountAmount) || 0
    const grossTotal = serviceTotal + otherTotal - discount
    const totalDeposits = patientDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0)
    const balanceDue = Math.max(0, grossTotal - totalDeposits)
    const refundDue = Math.max(0, totalDeposits - grossTotal)
    return { serviceTotal, otherTotal, discount, grossTotal, totalDeposits, balanceDue, refundDue }
  }

  const billData = selectedPatient ? calculateBill() : null

  const handleGenerateBill = async () => {
    if (!selectedPatient) return
    setLoading(true)
    try {
      const res = await billingAPI.generateBill({
        patientId: selectedPatient.id,
        otherCharges: parseFloat(otherChargesAmount) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        paymentMode: paymentMode || undefined,
        notes: notes || undefined,
      })
      const billResult = res.data.data
      setGeneratedBill(billResult)
      setShowSuccessModal(true)
      printBillDocument(billResult)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate bill')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/billing')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Generate Final Bill</h1>
          <p className="text-slate-500">Search patient and generate bill</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Search & Select */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Search Patient</h3>
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-sm text-slate-500">Loading patients...</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Patient ID / Name / Phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </Button>
                </div>

                {searching && (
                  <div className="mt-4 flex items-center justify-center gap-2 py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-slate-500">Searching...</p>
                  </div>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-slate-500">{searchResults.length} patient(s) found</p>
                    {searchResults.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => selectPatient(patient)}
                        className={`w-full p-3 rounded-xl border text-left transition-colors ${selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                      >
                        <p className="font-medium text-slate-800">{patient.name}</p>
                        <p className="text-sm text-slate-500">{patient.id} • {patient.phone}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{patient.age} yrs / {patient.gender}</p>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && hasSearched && searchTerm && searchResults.length === 0 && (
                  <p className="mt-4 text-sm text-slate-500 text-center py-4">No patients found</p>
                )}
              </>
            )}
          </div>

          {/* Selected Patient Info */}
          {selectedPatient && !fetchingDetails && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Patient Details</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {selectedPatient.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedPatient.name}</p>
                  <p className="text-sm text-slate-500">{selectedPatient.age} yrs / {selectedPatient.gender}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-slate-500">ID: <span className="font-mono font-semibold text-blue-600">{selectedPatient.id}</span></p>
                <p className="text-slate-500">Phone: <span className="font-medium text-slate-700">{selectedPatient.phone}</span></p>
                {selectedPatient.address && <p className="text-slate-500">Address: <span className="text-slate-700">{selectedPatient.address}</span></p>}
              </div>
              {existingBill && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 font-medium">⚠ Bill already generated: {existingBill.billNumber}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right - Bill Calculation */}
        <div className="lg:col-span-2">
          {fetchingDetails ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Fetching Patient Details...</h3>
              <p className="text-slate-500">Loading services and deposits</p>
            </div>
          ) : selectedPatient && billData ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">{existingBill ? 'Bill Summary' : 'Bill Calculation'}</h3>
                <p className="text-sm text-slate-500">{existingBill ? 'Bill already generated for this patient' : 'Review charges before generating bill'}</p>
                {existingBill && (
                  <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Bill Generated ({existingBill.billNumber})</span>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* Services */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <h4 className="font-medium text-slate-700">Assigned Services</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    {patientServices.map((svc: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">
                          {svc.service?.name || 'Service'} × {svc.quantity || 1}
                          <span className="text-xs text-slate-400 ml-2">({formatDate(svc.serviceDate)})</span>
                        </span>
                        <span>₹{Number(svc.totalFee).toLocaleString()}</span>
                      </div>
                    ))}
                    {patientServices.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">No services assigned</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-semibold">
                      <span>Services Subtotal</span>
                      <span>₹{billData.serviceTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Other Charges */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <h4 className="font-medium text-slate-700">Other Charges</h4>
                  </div>
                  <div className="p-4">
                    {existingBill ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Additional Charges</span>
                        <span className="font-semibold text-slate-800">₹{billData.otherTotal.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input type="number" placeholder="Enter other charges..." value={otherChargesAmount} onChange={(e) => setOtherChargesAmount(e.target.value)} />
                        <span className="font-semibold text-slate-800 whitespace-nowrap">₹{billData.otherTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount */}
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                    <h4 className="font-medium text-amber-700">Discount</h4>
                  </div>
                  <div className="p-4">
                    {existingBill ? (
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700">Discount Applied</span>
                        <span className="font-semibold text-amber-700">- ₹{billData.discount.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input type="number" placeholder="Enter discount amount" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                        <span className="font-semibold text-amber-700 whitespace-nowrap">- ₹{billData.discount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gross Total */}
                <div className="bg-slate-800 text-white rounded-xl p-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>GROSS TOTAL</span>
                    <span>₹{billData.grossTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deposits */}
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl overflow-hidden">
                  <div className="bg-emerald-100 px-4 py-2 border-b border-emerald-200">
                    <h4 className="font-medium text-emerald-700">Deposits Received</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    {patientDeposits.map((dep: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-emerald-700">{formatDate(dep.paymentDate)} ({paymentModeLabel(dep.paymentMode)})</span>
                        <span className="font-semibold text-emerald-700">₹{Number(dep.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    {patientDeposits.length === 0 && (
                      <p className="text-sm text-emerald-500 text-center py-2">No deposits received</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200 font-semibold text-emerald-800">
                      <span>Total Deposits</span>
                      <span>₹{billData.totalDeposits.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Balance/Refund */}
                {billData.balanceDue > 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex justify-between items-center text-lg font-bold text-red-700">
                      <span>BALANCE DUE</span>
                      <span>₹{billData.balanceDue.toLocaleString()}</span>
                    </div>
                    {!existingBill && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <label className="block text-sm font-medium text-red-700 mb-2">Payment Mode</label>
                        <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={paymentModeOptions} />
                      </div>
                    )}
                  </div>
                ) : billData.refundDue > 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex justify-between items-center text-lg font-bold text-orange-700">
                      <span>REFUND DUE TO PATIENT</span>
                      <span>₹{billData.refundDue.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-orange-600 mt-2">Excess deposit will be refunded after bill generation</p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex justify-between items-center text-lg font-bold text-emerald-700">
                      <span>BALANCE</span>
                      <span>₹0 (Fully Settled)</span>
                    </div>
                  </div>
                )}

                {!existingBill && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                    <Input placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {existingBill ? (
                    <Button className="flex-1" onClick={() => printBillDocument({ ...existingBill, patient: selectedPatient, patientServices, deposits: patientDeposits })}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Bill
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={handleGenerateBill} disabled={loading}>
                      {loading ? (
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {loading ? 'Generating...' : 'Generate & Print Bill'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Search Patient to Generate Bill</h3>
              <p className="text-slate-500">Enter Patient ID, Name or Phone to search</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Bill Generated!</h3>
            <p className="text-slate-500 mb-2">Final bill has been generated successfully.</p>
            {generatedBill && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
                <p className="text-slate-600">Bill No: <span className="font-mono font-semibold">{generatedBill.billNumber}</span></p>
                <p className="text-slate-600 mt-1">Gross Total: <span className="font-semibold">₹{Number(generatedBill.grossTotal).toLocaleString()}</span></p>
                {Number(generatedBill.balanceDue) > 0 && (
                  <p className="text-red-600 mt-1">Balance Due: <span className="font-semibold">₹{Number(generatedBill.balanceDue).toLocaleString()}</span></p>
                )}
                {Number(generatedBill.refundAmount) > 0 && (
                  <p className="text-orange-600 mt-1">Refund Due: <span className="font-semibold">₹{Number(generatedBill.refundAmount).toLocaleString()}</span></p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/billing')}>Go to Billing</Button>
              <Button className="flex-1" onClick={() => { setShowSuccessModal(false); setSelectedPatient(null); setPatientServices([]); setPatientDeposits([]); setExistingBill(null) }}>New Bill</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GenerateBill
