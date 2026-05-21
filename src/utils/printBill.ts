import { settingsAPI } from '../api/endpoints'

const paymentModeLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  ONLINE: 'Online',
}

/**
 * Converts a number to words in Indian numbering system
 * Example: 1234567 -> "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees"
 */
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = ['', 'Thousand', 'Lakh', 'Crore']

  if (num === 0) return 'Zero Rupees'

  let result: string[] = []
  let scaleIndex = 0

  while (num > 0) {
    let remainder = num % (scaleIndex === 0 ? 1000 : 100)
    num = Math.floor(num / (scaleIndex === 0 ? 1000 : 100))

    if (remainder > 0) {
      let groupWords = ''

      if (remainder >= 100) {
        groupWords += ones[Math.floor(remainder / 100)] + ' Hundred'
        remainder %= 100
        if (remainder > 0) groupWords += ' '
      }

      if (remainder >= 20) {
        groupWords += tens[Math.floor(remainder / 10)]
        remainder %= 10
        if (remainder > 0) groupWords += ' ' + ones[remainder]
      } else if (remainder >= 10) {
        groupWords += teens[remainder - 10]
      } else if (remainder > 0) {
        groupWords += ones[remainder]
      }

      if (scales[scaleIndex]) {
        groupWords += ' ' + scales[scaleIndex]
      }

      result.push(groupWords)
    }

    scaleIndex++
  }

  return result.reverse().join(' ') + ' Rupees'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Opens a new window and prints a final bill document.
 * Accepts a bill object (from API) or a constructed preview object.
 *
 * Expected shape:
 * {
 *   id?, roomCharges, serviceCharges, otherCharges, grossTotal,
 *   totalDeposits, balanceDue, refundAmount, paymentStatus?, paymentMode?,
 *   generatedDate?, days?, roomRate?, dischargeDate?, notes?,
 *   admission: {
 *     admitId, admissionDate, actualDischarge?, diagnosis?,
 *     patient: { name, patientId?, id?, age, gender, phone },
 *     doctor: { name, specialization? },
 *     room: { roomNumber, roomType: { type, rentPerDay } },
 *     bed: { bedNumber },
 *     patientServices?: [...],
 *     deposits?: [...]
 *   }
 * }
 */
export async function printBillDocument(bill: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  // Fetch hospital settings
  let hospital = { name: 'Dr Help', address: '', phone: '', logo: '' }
  try {
    const res = await settingsAPI.getHospital()
    if (res.data.data) {
      const s = res.data.data
      hospital = {
        name: s.name || hospital.name,
        address: s.address || hospital.address,
        phone: s.phone || hospital.phone,
        logo: s.logo || '',
      }
    }
  } catch { /* use defaults */ }

  const adm = bill.admission || {}
  const patient = adm.patient || {}
  const doctor = adm.doctor || {}
  const room = adm.room || {}
  const roomType = room.roomType || {}
  const bed = adm.bed || {}
  const services = adm.patientServices || []
  const deposits = adm.deposits || []

  const billId = bill.billNumber ? bill.billNumber : '(Preview)'
  const generatedDate = bill.generatedDate
    ? formatDate(bill.generatedDate)
    : formatDate(new Date().toISOString())
  const admitId = adm.admitId || '-'
  const admitDate = formatDate(adm.admissionDate)
  const dischargeDate = bill.dischargeDate
    ? formatDate(bill.dischargeDate)
    : adm.actualDischarge
      ? formatDate(adm.actualDischarge)
      : formatDate(new Date().toISOString())

  // Compute days
  let days = bill.days || 0
  if (!days && adm.admissionDate) {
    const start = new Date(adm.admissionDate)
    const end = adm.actualDischarge ? new Date(adm.actualDischarge) : new Date()
    days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }
  if (!days) days = 1

  const patientName = patient.name || '-'
  const patientId = patient.patientId || patient.id || '-'
  const patientAge = patient.age || '-'
  const patientGender = patient.gender || '-'
  const patientPhone = patient.phone || '-'
  const patientAddress = patient.address || '-'
  const doctorName = doctor.name || '-'
  const doctorSpec = doctor.specialization || ''
  const roomNumber = room.roomNumber || '-'
  const roomTypeName = roomType.type || '-'
  const bedNumber = bed.bedNumber || '-'
  const roomRate = Number(bill.roomRate || roomType.rentPerDay || 0)
  const diagnosis = adm.diagnosis || ''

  const roomCharges = Number(bill.roomCharges || 0)
  const serviceCharges = Number(bill.serviceCharges || 0)
  const otherCharges = Number(bill.otherCharges || 0)
  const discount = Number(bill.discountAmount || bill.discount || 0)
  const grossTotal = Number(bill.grossTotal || 0)
  const totalDeposits = Number(bill.totalDeposits || 0)
  const balanceDue = Number(bill.balanceDue || 0)
  const refundAmount = Number(bill.refundAmount || 0)
  const paymentStatus = bill.paymentStatus || ''
  const paymentMode = bill.paymentMode
    ? paymentModeLabels[bill.paymentMode] || bill.paymentMode
    : '-'
  const notes = bill.notes || ''

  // Build services rows
  let servicesHTML = ''
  if (services.length > 0) {
    services.forEach((svc: any, idx: number) => {
      const svcName = svc.service?.name || 'Service'
      const qty = svc.quantity || 1
      const total = Number(svc.totalFee || 0)
      const rate = qty > 0 ? Math.round(total / qty) : total
      servicesHTML += `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${svcName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${qty}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${rate.toLocaleString()}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${total.toLocaleString()}</td>
        </tr>`
    })
  } else {
    servicesHTML = `<tr><td colspan="5" style="padding:5px 8px;text-align:center;color:#94a3b8;border-bottom:1px solid #e2e8f0;">No services</td></tr>`
  }

  // Build deposits rows
  let depositsHTML = ''
  if (deposits.length > 0) {
    deposits.forEach((dep: any) => {
      depositsHTML += `
        <tr>
          <td style="padding:3px 8px;">${formatDate(dep.paymentDate)}</td>
          <td style="padding:3px 8px;">${paymentModeLabels[dep.paymentMode] || dep.paymentMode}</td>
          <td style="padding:3px 8px;">${dep.receiptNumber || '-'}</td>
          <td style="padding:3px 8px;text-align:right;">₹${Number(dep.amount).toLocaleString()}</td>
        </tr>`
    })
  } else {
    depositsHTML = `<tr><td colspan="4" style="padding:3px 8px;text-align:center;color:#94a3b8;">No deposits</td></tr>`
  }

  // Balance section
  let balanceHTML = ''
  if (balanceDue > 0) {
    balanceHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <span style="font-weight:700;color:#991b1b;font-size:14px;">BALANCE DUE</span>
      <span style="font-weight:800;color:#991b1b;font-size:18px;">₹${balanceDue.toLocaleString()}</span>
    </div>`
  } else if (refundAmount > 0) {
    balanceHTML = `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;padding:5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <span style="font-weight:700;color:#9a3412;font-size:14px;">REFUND DUE</span>
      <span style="font-weight:800;color:#9a3412;font-size:18px;">₹${refundAmount.toLocaleString()}</span>
    </div>`
  } else {
    balanceHTML = `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <span style="font-weight:700;color:#065f46;font-size:14px;">FULLY SETTLED</span>
      <span style="font-weight:800;color:#065f46;font-size:18px;">₹0</span>
    </div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title> </title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:10px;color:#1e293b;font-size:12px;}
    .bill{max-width:700px;margin:0 auto;border:2px solid #1e293b;padding:10px 15px;}
    .header{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:10px;}
    .hospital-logo{width:48px;height:48px;object-fit:contain;margin-bottom:4px;}
    .hospital-name{font-size:20px;font-weight:800;color:#1e40af;}
    .hospital-addr{font-size:10px;color:#64748b;margin-top:2px;}
    .bill-title{font-size:14px;font-weight:700;color:#1e40af;margin-top:6px;letter-spacing:1px;}
    .info-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;}
    .info-row p{margin:1px 0;}
    .lbl{color:#64748b;} .val{font-weight:600;}
    .pbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-bottom:8px;}
    .pbox h4{font-size:11px;font-weight:700;margin-bottom:4px;color:#334155;}
    .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:11px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;}
    th{background:#f1f5f9;padding:5px 8px;text-align:left;font-weight:700;border-bottom:2px solid #cbd5e1;font-size:10px;}
    .tot-row{background:#1e293b;color:white;}
    .tot-row td{padding:7px 8px;font-weight:800;font-size:13px;}
    .dep-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:8px;margin-bottom:8px;}
    .dep-box h4{font-size:11px;font-weight:700;color:#065f46;margin-bottom:4px;}
    .dep-total{border-top:1px solid #6ee7b7;font-weight:700;}
    .footer{text-align:center;border-top:1px dashed #94a3b8;padding-top:2px;margin-top:2px;font-size:9px;color:#94a3b8;}
    @page{size:auto;margin:0;}
    @media print{
      body{padding:15px;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .bill{border:2px solid #000;page-break-inside:avoid;}
      .hospital-logo{width:48px!important;height:48px!important;object-fit:contain!important;display:inline-block;}
    }
  </style>
</head>
<body>
  <div class="bill">
    <div class="header">
      ${hospital.logo ? `<img src="${hospital.logo}" alt="Logo" class="hospital-logo" />` : ''}
      <div class="hospital-name">${hospital.name}</div>
      <div class="hospital-addr">${hospital.address} | Phone: ${hospital.phone}</div>
      <div class="bill-title">FINAL BILL</div>
    </div>

    <div class="info-row">
      <div>
        <p><span class="lbl">Bill No:</span> <span class="val">${billId}</span></p>
        <p><span class="lbl">Bill Date:</span> <span class="val">${generatedDate}</span></p>
        <p><span class="lbl">Admit ID:</span> <span class="val">${admitId}</span></p>
      </div>
      <div style="text-align:right;">
        <p><span class="lbl">Admit Date:</span> <span class="val">${admitDate}</span></p>
        <p><span class="lbl">Discharge Date:</span> <span class="val">${dischargeDate}</span></p>
        <p><span class="lbl">Duration:</span> <span class="val">${days} day(s)</span></p>
      </div>
    </div>

    <div class="pbox">
      <h4>Patient Information</h4>
      <div class="pgrid">
        <p><span class="lbl">Name:</span> <span class="val">${patientName}</span></p>
        <p><span class="lbl">Patient ID:</span> <span class="val">${patientId}</span></p>
        <p><span class="lbl">Age/Gender:</span> <span class="val">${patientAge} yrs / ${patientGender}</span></p>
        <p><span class="lbl">Phone:</span> <span class="val">${patientPhone}</span></p>
        <p><span class="lbl">Address:</span> <span class="val">${patientAddress}</span></p>
        <p><span class="lbl">Doctor:</span> <span class="val">${doctorName}${doctorSpec ? ' (' + doctorSpec + ')' : ''}</span></p>
        <p><span class="lbl">Room:</span> <span class="val">${roomNumber} (${roomTypeName}) - Bed ${bedNumber}</span></p>
        ${diagnosis ? `<p style="grid-column:span 2"><span class="lbl">Diagnosis:</span> <span class="val">${diagnosis}</span></p>` : ''}
      </div>
    </div>

    <table style="border:1px solid #e2e8f0;">
      <thead>
        <tr>
          <th style="width:28px;">#</th>
          <th>Description</th>
          <th style="text-align:center;">Unit</th>
          <th style="text-align:right;">Charge (₹)</th>
          <th style="text-align:right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#eff6ff;">
          <td colspan="5" style="padding:4px 8px;font-weight:700;color:#1e40af;border-bottom:1px solid #e2e8f0;">Room Charges</td>
        </tr>
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">1</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${roomTypeName} Room</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${days}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${roomRate.toLocaleString()}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${roomCharges.toLocaleString()}</td>
        </tr>
        <tr style="background:#eff6ff;">
          <td colspan="5" style="padding:4px 8px;font-weight:700;color:#1e40af;border-bottom:1px solid #e2e8f0;">Services</td>
        </tr>
        ${servicesHTML}
        <tr style="background:#f8fafc;">
          <td colspan="4" style="padding:5px 8px;text-align:right;font-weight:600;border-bottom:1px solid #e2e8f0;">Services Subtotal</td>
          <td style="padding:5px 8px;text-align:right;font-weight:600;border-bottom:1px solid #e2e8f0;">₹${serviceCharges.toLocaleString()}</td>
        </tr>
        ${otherCharges > 0 ? `
        <tr style="background:#eff6ff;">
          <td colspan="5" style="padding:4px 8px;font-weight:700;color:#1e40af;border-bottom:1px solid #e2e8f0;">Other Charges</td>
        </tr>
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">1</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">Additional Charges${notes ? ' (' + notes + ')' : ''}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">1</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${otherCharges.toLocaleString()}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${otherCharges.toLocaleString()}</td>
        </tr>` : ''}
        ${discount > 0 ? `
        <tr style="background:#fffbeb;">
          <td colspan="4" style="padding:5px 8px;text-align:right;font-weight:600;color:#92400e;border-bottom:1px solid #e2e8f0;">Discount</td>
          <td style="padding:5px 8px;text-align:right;font-weight:600;color:#92400e;border-bottom:1px solid #e2e8f0;">- ₹${discount.toLocaleString()}</td>
        </tr>` : ''}
      </tbody>
      <tfoot>
        <tr class="tot-row">
          <td colspan="4" style="text-align:right;">GROSS TOTAL</td>
          <td style="text-align:right;">₹${grossTotal.toLocaleString()}</td>
        </tr>
        <tr style="background:#f0f9ff;border-bottom:2px solid #1e293b;">
          <td colspan="5" style="padding:8px;text-align:left;font-weight:600;color:#1e40af;font-size:12px;">Amount in Words: ${numberToWords(Math.round(grossTotal))}</td>
        </tr>
      </tfoot>
    </table>

    <div class="dep-box">
      <h4>Deposits Received</h4>
      <table>
        <thead>
          <tr>
            <th style="background:transparent;border-bottom:1px solid #6ee7b7;font-size:9px;">Date</th>
            <th style="background:transparent;border-bottom:1px solid #6ee7b7;font-size:9px;">Mode</th>
            <th style="background:transparent;border-bottom:1px solid #6ee7b7;font-size:9px;">Receipt</th>
            <th style="background:transparent;border-bottom:1px solid #6ee7b7;font-size:9px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${depositsHTML}
          <tr class="dep-total">
            <td colspan="3" style="padding:5px 8px;">Total Deposits</td>
            <td style="padding:5px 8px;text-align:right;">₹${totalDeposits.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${balanceHTML}

    ${paymentStatus === 'PAID' ? `
    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:4px;padding:6px;text-align:center;margin-bottom:8px;">
      <span style="font-weight:700;color:#166534;">✓ PAID IN FULL - ${paymentMode}</span>
    </div>` : ''}

    <div style="display:flex;justify-content:flex-end;margin-top:10px;">
      <div style="text-align:center">
        <div style="border-top:2px solid #1e293b;width:150px;height:5px;margin-bottom:2px;"></div>
        <p style="font-size:10px;font-weight:600;color:#1e293b">Authorized Signature</p>
      </div>
    </div>

    <div class="footer">
      <p>Generated by: Reception | Date: ${generatedDate}</p>
    </div>
  </div>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
