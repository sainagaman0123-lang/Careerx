import React, { useState, useEffect } from 'react';
import { Receipt, Download, Building2, CheckCircle2, ShieldCheck, MessageSquare, Mail, Calendar, DollarSign, Tag } from 'lucide-react';
import { getPharmacyBills } from '../../services/storage';
import { PharmacyBill } from '../../types/pharmacy';
import { downloadHospitalBillPdf } from '../../services/pdfGenerator';
import { useLanguage } from '../../context/LanguageContext';

export const MyBills: React.FC = () => {
  const { t } = useLanguage();
  const [bills, setBills] = useState<PharmacyBill[]>([]);

  useEffect(() => {
    setBills(getPharmacyBills());
  }, []);

  const totalPaid = bills.reduce((acc, b) => acc + b.grandTotal, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>billing_agent & Jan Aushadhi Sync</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('bills_title', 'My Pharmacy Bills & Dispensation Receipts')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {t('bills_subtitle', 'Official government subsidized Jan Aushadhi dispensary receipts transmitted directly by billing_agent to your patient portal.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-right">
              <span className="text-xs text-slate-400 block">{t('bills_total_paid', 'Total Amount Paid')}</span>
              <span className="text-xl font-bold text-emerald-400">₹{totalPaid.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-6">
        {bills.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-300">No pharmacy invoices yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              When medicines are dispensed at Jan Aushadhi hospital pharmacy counters, official GST receipts will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xl hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden"
              >
                {/* Header Information */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
                        {bill.billNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        {bill.hospitalName} ({bill.hospitalCode})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                        {bill.paymentMethod}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(bill.timestamp).toLocaleDateString()} {new Date(bill.timestamp).toLocaleTimeString()}
                      </span>
                      <span>GSTIN: {bill.hospitalGst || '07AAAGA0001A1Z5'}</span>
                    </div>
                  </div>

                  {/* Actions & Total */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Grand Total</span>
                      <span className="text-2xl font-bold text-white">₹{bill.grandTotal.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => downloadHospitalBillPdf(bill)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      {t('bills_download_pdf', 'Download Official PDF Bill')}
                    </button>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Dispensed Items ({bill.items.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-medium">#</th>
                          <th className="pb-2 font-medium">Medicine Name / Formulation</th>
                          <th className="pb-2 font-medium text-center">Qty</th>
                          <th className="pb-2 font-medium text-right">Unit Price</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {bill.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 font-medium text-white">{item.medicineName}</td>
                            <td className="py-2.5 text-center">{item.quantity}</td>
                            <td className="py-2.5 text-right text-slate-400">₹{item.unitPrice.toFixed(2)}</td>
                            <td className="py-2.5 text-right font-medium text-emerald-400">₹{item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Subtotal & Dispatch status */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Ayushman Subsidized
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      {t('bills_sent_whatsapp', 'Sent to WhatsApp')}: {bill.sentToWhatsApp ? '✔' : 'Pending'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {t('bills_sent_email', 'Sent to Email')}: {bill.sentToEmail ? '✔' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-300">
                    <span>Subtotal: ₹{bill.subtotal.toFixed(2)}</span>
                    <span>GST (5%): ₹{bill.gstAmount.toFixed(2)}</span>
                    {bill.discountAmount > 0 && (
                      <span className="text-emerald-400">Discount: -₹{bill.discountAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
