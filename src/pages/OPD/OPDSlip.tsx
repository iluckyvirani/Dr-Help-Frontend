import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { opdAPI } from '../../api/endpoints'
import Barcode from 'react-barcode'


import defaultLogo from '../../assets/Dimag Hospital logo1.png'

const OPDSlip = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  const [slipData, setSlipData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSlip = async () => {
      if (!id) { setError('No visit ID provided'); setLoading(false); return }
      try {
        setLoading(true)
        const res = await opdAPI.getSlip(id)
        setSlipData(res.data.data)
      } catch (err: any) {
        console.error('Failed to fetch OPD slip:', err)
        setError(err?.response?.data?.message || 'Failed to load slip data')
      } finally {
        setLoading(false)
      }
    }
    fetchSlip()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500">Loading slip data...</p>
      </div>
    )
  }

  if (error || !slipData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-500">{error || 'No patient data found'}</p>
        <Button onClick={() => navigate('/opd')}>
          Go to OPD List
        </Button>
      </div>
    )
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title> </title>
          <base href="${window.location.origin}" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 0;
              margin: 0;
            }
            .slip {
            height: 3500mm;
              border: 2px solid #000;
              padding: 20px 10px;
              position: relative;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .hospital-name {
              font-size: 30px;
              font-weight: bold;
              color: #1e40af;
            }
            .hospital-address {
              font-size: 12px;
              color: #666;
              font-weight: 800;
              margin-top: 3px;
            }
            .hospital-logo {
              width: 40px;
              height: 40px;
              object-fit: contain;
            }
            .token-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 6px 12px;
              background: #f0f9ff;
              border-radius: 6px;
              margin-bottom: 6px;
            }
            .token-number {
              font-size: 16px;
              font-weight: bold;
              color: #1e40af;
            }
            .space-y-2 > div {
              margin-bottom: 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              color: #334155;
              font-size: 13px;
              font-weight: 700;
            }
            .info-value {
              font-weight: 800;
              font-size: 13px;
              color: #1e293b;
            }
            .doctor-section {
              background: #ecfdf5;
              padding: 6px 12px;
              border-radius: 6px;
              margin: 15px 0;
              border-left: 4px solid #059669;
            }
            .doctor-section > span:first-child {
              font-size: 10px;
              font-weight: 700;
              color: #065f46;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doctor-name {
              font-weight: 900;
              color: #047857;
              font-size: 14px;
              margin-top: 2px;
            }
            .doctor-section > p:last-child {
              font-size: 11px;
              color: #475569;
              margin-top: 1px;
            }
            /* Fee section */
            .fee-section {
              background: #fffbeb;
              border-left: 4px solid #d97706;
              border-radius: 6px;
              padding: 6px 12px;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .fee-label {
              font-size: 10px;
              font-weight: 700;
              color: #92400e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .fee-amount {
              font-size: 18px;
              font-weight: 900;
              color: #78350f;
            }
            /* OPD Number section */
            .opd-number-section {
              background: #eff6ff;
              border-left: 4px solid #2563eb;
              border-radius: 6px;
              padding: 6px 12px;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .opd-label {
              font-size: 12px;
              font-weight: 700;
              color: #1e40af;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .opd-value {
              font-size: 16px;
              font-weight: 900;
              color: #1e40af;
            }
            .barcode-section {
              position: absolute;
              top: 8px;
              right: 10px;
              text-align: center;
            }
            .payment-badge {
              display: inline-block;
              padding: 3px 10px;
              background: #dcfce7;
              color: #166534;
              font-weight: 900;
              border-radius: 20px;
              font-size: 11px;
            }
            .payment-badge.pending {
              background: #fef3c7;
              color: #92400e;
            }
            .footer {
              text-align: center;
              margin-top: 4px;
              font-size: 10px;
              font-weight: 700;
              color: #666;
              padding-bottom: 4px;
              border-bottom: 2px dashed #000;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            @media print {
              html, body {
                width: 300mm;
                height: 350mm;
                padding: 10mm 8mm;
                margin: 0;
              }
              .slip {
                border: 2px solid #000;
                padding: 20px 40px;
                page-break-inside: avoid;
              }
              .slip * { page-break-inside: avoid !important; }
              .hospital-logo {
                width: 40px !important;
                height: 40px !important;
                object-fit: contain !important;
                display: inline-block;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // const formatAadhar = (aadhar: string) => {
  //   if (aadhar?.includes('XXXX')) return aadhar
  //   return `XXXX-XXXX-${aadhar?.slice(-4) || '****'}`
  // }

  const genderLabel = (g: string) => {
    if (g === 'MALE' || g === 'male') return 'Male'
    if (g === 'FEMALE' || g === 'female') return 'Female'
    return 'Other'
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OPD Slip</h1>
          <p className="text-slate-500 mt-1">Print patient registration slip</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className='cursor-pointer'>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to OPD
          </Button>
          <Button onClick={handlePrint} className='cursor-pointer'>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Slip
          </Button>
        </div>
      </div>

      {/* Slip Preview */}
      <div className="flex justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          {/* Printable Content */}
          <div ref={printRef} className="slip relative">
            {/* Barcode - Top Right */}
            <div className="barcode-section absolute top-2 right-2">
              <Barcode
                value={`OPD-${slipData.token || '0000'}`}
                format="CODE128"
                width={1.2}
                height={25}
                fontSize={8}
                margin={0}
              />
            </div>

            {/* Hospital Header */}
            <div className="header text-center border-b-2 border-dashed border-slate-300 pb-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src={slipData.hospital?.logo || defaultLogo} alt="Hospital Logo" className="w-12 h-12 object-contain hospital-logo" />
              </div>
              <h1 className="hospital-name text-xl font-bold text-blue-700">{slipData.hospital?.name || 'DR HELP'}</h1>
              <p className="hospital-address text-xs text-slate-500 mt-1">
                {slipData.hospital?.address || '42/4 बी, बिल्लोचपुरा, मथुरा रोड, आगरा-2'}<br />
                Mobile: {slipData.hospital?.phone || '74090 00917'}
              </p>
            </div>

            {/* Token & Date */}
            <div className="token-section flex items-center justify-between p-3 bg-blue-50 rounded-xl mb-4">
              <div>
                <span className="text-xs text-slate-500">Invoice Number</span>
                <p className="token-number text-lg font-bold text-blue-600">
                  #{slipData.invoice || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Date</span>
                <p className="font-semibold text-slate-700">{formatDate(slipData.date)}</p>
              </div>
            </div>

            {/* Patient Information */}
            <div className="space-y-2 mb-4">
              <div className="info-row flex justify-between py-2 border-b border-dashed border-slate-200">
                <span className="info-label text-xs text-slate-500">Patient Name</span>
                <span className="info-value font-semibold text-slate-800">{slipData.patient?.name}</span>
              </div>
              <div className="info-row flex justify-between py-2 border-b border-dashed border-slate-200">
                <span className="info-label text-xs text-slate-500">Age / Gender</span>
                <span className="info-value font-medium text-slate-700">
                  {slipData.patient?.age} years / {genderLabel(slipData.patient?.gender)}
                </span>
              </div>
              <div className="info-row flex justify-between py-2 border-b border-dashed border-slate-200">
                <span className="info-label text-xs text-slate-500">Phone</span>
                <span className="info-value font-medium text-slate-700">{slipData.patient?.phone}</span>
              </div>

              <div className="info-row flex justify-between py-2 border-b border-dashed border-slate-200">
                <span className="info-label text-xs text-slate-500">Address</span>
                <span className="info-value font-medium text-slate-700">{slipData.patient?.address}</span>
              </div>
            </div>

            {/* Doctor Information */}
            <div className="doctor-section p-3 bg-emerald-50 rounded-xl mb-4">
              <span className="text-xs text-emerald-600">Consulting Doctor</span>
              <p className="doctor-name font-bold text-emerald-700">{slipData.doctor?.name || 'N/A'}</p>
              <p className="text-sm text-slate-600">{slipData.doctor?.specialization || ''}</p>
            </div>

            {/* Symptoms */}
            {slipData.symptoms && (
              <div className="mb-4">
                <span className="text-xs text-slate-500">Symptoms / Chief Complaint</span>
                <p className="text-sm text-slate-700 mt-1 p-2 bg-slate-50 rounded-lg">{slipData.symptoms}</p>
              </div>
            )}

            {/* Fee & Payment */}
            <div className="fee-section flex items-center justify-between p-3 bg-amber-50 rounded-xl mb-4">
              <div>
                <span className="fee-label text-xs text-slate-500">Consultation Fee</span>
                <p className="fee-amount text-xl font-bold text-slate-800">₹{Number(slipData.fee)}</p>
              </div>
              <span className={`payment-badge px-3 py-1 rounded-full text-xs font-bold ${slipData.paymentStatus === 'PAID'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
                }`}>
                {slipData.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'}
              </span>
            </div>
            <div className='opd-number-section flex items-center justify-center gap-2 mb-2'>
              <span className="opd-label text-sm text-black font-bold">OPD Number</span>
              <p className="opd-value token-number text-lg font-bold text-blue-600">
                #{slipData.token || 'N/A'}
              </p>
            </div>

            {/* Footer */}
            <div className="footer text-center mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-400">
                Thank you for choosing {slipData.hospital?.name || 'Dr Help'}<br />
                Please retain this slip for future reference
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate('/opd/register')} className='cursor-pointer'>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Registration
        </Button>
      </div>
    </div>
  )
}

export default OPDSlip
