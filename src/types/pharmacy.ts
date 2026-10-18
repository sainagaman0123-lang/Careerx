export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  batchNumber: string;
  pricePerUnit: number;
  availableQuantity: number;
  minimumThreshold: number;
  expiryDate: string;
  manufacturer: string;
  hospitalId: string;
  rack?: number;
  column?: number;
  row?: number;
  location?: string;
}

export interface BillItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PharmacyBill {
  id: string;
  billNumber: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  hospitalAddress: string;
  hospitalGst: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientWhatsApp: string;
  doctorName?: string;
  items: BillItem[];
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Ayushman Bharat (Subsidized)';
  timestamp: string;
  sentToWhatsApp: boolean;
  sentToEmail: boolean;
}
