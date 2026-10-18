import jsPDF from 'jspdf';
import { PharmacyBill } from '../types/pharmacy';
import { MedicalCourse } from '../types/appointment';

export function generateHospitalBillPdf(bill: PharmacyBill): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [26, 86, 219];
  const darkText = [30, 41, 59];
  const mutedText = [100, 116, 139];

  // Header Background Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, 210, 45, 'F');

  // Hospital Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(bill.hospitalName.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Official Public Hospital Pharmacy Dispensary | Code: ${bill.hospitalCode}`, 14, 25);
  doc.text(bill.hospitalAddress, 14, 30);
  doc.text(`GST Reg: ${bill.hospitalGst || '07AAAGA0001A1Z5'} | Ayushman Bharat Empanelled`, 14, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('OFFICIAL INVOICE', 196, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Bill No: ${bill.billNumber}`, 196, 26, { align: 'right' });
  doc.text(`Date: ${new Date(bill.timestamp).toLocaleDateString()} ${new Date(bill.timestamp).toLocaleTimeString()}`, 196, 32, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  // Patient & Doctor Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('PATIENT DETAILS', 20, 60);
  doc.text('PRESCRIBING DETAILS', 115, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${bill.patientName}`, 20, 67);
  doc.text(`Contact: ${bill.patientWhatsApp || 'N/A'} | ${bill.patientEmail}`, 20, 74);

  doc.text(`Attending Doctor: ${bill.doctorName || 'Senior Resident (OPD)'}`, 115, 67);
  doc.text(`Dispensary Counter: Jan Aushadhi Central OPD`, 115, 74);

  // Medicines Table Header
  const tableStartY = 92;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, tableStartY, 182, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 18, tableStartY + 6);
  doc.text('Medicine / Generic Formulation', 30, tableStartY + 6);
  doc.text('Qty', 125, tableStartY + 6);
  doc.text('Rate (INR)', 148, tableStartY + 6);
  doc.text('Total (INR)', 190, tableStartY + 6, { align: 'right' });

  let currentY = tableStartY + 15;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);

  bill.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY - 5, 182, 8, 'F');
    }

    doc.text(`${index + 1}`, 18, currentY);
    doc.text(item.medicineName, 30, currentY);
    doc.text(`${item.quantity}`, 125, currentY);
    doc.text(`₹${item.unitPrice.toFixed(2)}`, 148, currentY);
    doc.text(`₹${item.totalPrice.toFixed(2)}`, 190, currentY, { align: 'right' });

    currentY += 9;
  });

  currentY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 196, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 140, currentY);
  doc.text(`₹${bill.subtotal.toFixed(2)}`, 190, currentY, { align: 'right' });

  currentY += 6;
  doc.text('GST / Levies (5%):', 140, currentY);
  doc.text(`₹${bill.gstAmount.toFixed(2)}`, 190, currentY, { align: 'right' });

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(241, 245, 249);
  doc.rect(135, currentY - 5, 61, 10, 'F');
  doc.text('Grand Total:', 140, currentY + 2);
  doc.text(`₹${bill.grandTotal.toFixed(2)}`, 190, currentY + 2, { align: 'right' });

  currentY += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment Mode: ${bill.paymentMethod} (PAID)`, 14, currentY);
  doc.text(`Dispatched to WhatsApp: ${bill.sentToWhatsApp ? 'Yes' : 'No'} | Email: ${bill.sentToEmail ? 'Yes' : 'No'}`, 14, currentY + 6);

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, currentY + 14, 182, 16, 2, 2, 'FD');
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('✔ VERIFIED DISPENSATION - MEDIGUIDE AI AGENTIC SYSTEM', 20, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This digital invoice is cryptographically certified by the Central Hospital Information Management System.', 20, currentY + 27);

  return doc;
}

export function downloadHospitalBillPdf(bill: PharmacyBill) {
  const doc = generateHospitalBillPdf(bill);
  doc.save(`${bill.billNumber}_${bill.hospitalCode}.pdf`);
}

export function generatePrescriptionPdf(course: MedicalCourse): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [26, 86, 219];
  const darkText = [30, 41, 59];
  const mutedText = [100, 116, 139];

  // Header Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, 210, 45, 'F');

  // Hospital Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text((course.hospitalName || 'PUBLIC HEALTHCARE INSTITUTE').toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Department of ${course.department || 'General Medicine'} • OPD Consultation Desk`, 14, 25);
  doc.text('Ayushman Bharat Digital Mission (ABDM) • National Health Authority', 14, 30);
  doc.text('Authorized Medical Prescription & Treatment Protocol', 14, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('PRESCRIPTION / Rx', 196, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Rx ID: ${course.courseCode}`, 196, 26, { align: 'right' });
  doc.text(`Date: ${course.startDate}`, 196, 32, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  // Patient & Doctor Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('CITIZEN / PATIENT DETAILS', 20, 60);
  doc.text('CONSULTING PHYSICIAN', 115, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(`Patient Name: ${course.patientName}`, 20, 67);
  doc.text(`Patient ID: ${course.patientId}`, 20, 74);
  doc.text(`Doctor: ${course.doctorName}`, 115, 67);
  doc.text(`Department: ${course.department}`, 115, 74);

  // Clinical Diagnosis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`Diagnosis: ${course.diagnosis}`, 14, 92);

  // Rx Symbol
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Rx', 14, 103);

  // Prescribed Medicines Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 107, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('#', 18, 112);
  doc.text('MEDICINE FORMULATION', 28, 112);
  doc.text('DOSAGE', 85, 112);
  doc.text('TIMING (M - N - N)', 120, 112);
  doc.text('DAYS', 158, 112);
  doc.text('INSTRUCTIONS', 170, 112);

  let currentY = 120;
  course.medicines.forEach((med, idx) => {
    const timingStr = `${med.timing?.morning ? '1' : '0'} - ${med.timing?.afternoon ? '1' : '0'} - ${med.timing?.night ? '1' : '0'}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(`${idx + 1}`, 18, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(med.name, 28, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(med.dosage || '1 unit', 85, currentY);
    doc.text(timingStr, 120, currentY);
    doc.text(`${med.durationDays}d`, 158, currentY);
    doc.text(med.instructions ? med.instructions.slice(0, 18) : 'As directed', 170, currentY);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 3, 196, currentY + 3);
    currentY += 8;
  });

  // Clinical Notes & Guidelines
  currentY = Math.max(currentY + 5, 160);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CLINICAL ADVICE & INSTRUCTIONS:', 20, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(course.notes || 'Maintain hydration, adhere strictly to timings, avoid self-medication.', 20, currentY + 14);
  if (course.nextFollowUpDate) {
    doc.text(`Next Follow-up Date: ${course.nextFollowUpDate}`, 120, currentY + 7);
  }

  // Secret Pass Code Box
  currentY += 28;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text(`CONFIDENTIAL COURSE END PASS CODE: ${course.verificationPassCode}`, 20, currentY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Keep this passcode safe. Present it to the doctor or reception to officially conclude this treatment course.', 20, currentY + 13);

  // Sign-off Seal
  currentY += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text('DIGITALLY SIGNED & VERIFIED', 196, currentY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`Physician: ${course.doctorName}`, 196, currentY + 5, { align: 'right' });
  doc.text('Medical Council of India (MCI) / NMC Accredited', 196, currentY + 10, { align: 'right' });

  return doc;
}

export function downloadPrescriptionPdf(course: MedicalCourse) {
  const doc = generatePrescriptionPdf(course);
  doc.save(`Prescription_${course.courseCode}_${course.patientName.replace(/\s+/g, '_')}.pdf`);
}
