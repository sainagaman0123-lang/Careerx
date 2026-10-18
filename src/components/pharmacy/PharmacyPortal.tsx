import React, { useState, useEffect, useRef } from 'react';
import {
  Pill,
  Receipt,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building2,
  Terminal,
  Activity,
  IndianRupee,
  Search,
  QrCode,
  MapPin,
  Clock,
  Share2,
  CheckCircle,
  X,
  Layers,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  getMedicines,
  saveMedicines,
  getPharmacyBills,
  addPharmacyBill,
  getAgentAuditLogs,
  getHospitals,
  restockOrAddMedicine,
  getPatientProfile,
} from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { Medicine, PharmacyBill, BillItem } from '../../types/pharmacy';
import { downloadHospitalBillPdf } from '../../services/pdfGenerator';
import { useLanguage } from '../../context/LanguageContext';

export const PharmacyPortal: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'inventory' | 'billing' | 'history' | 'agent'>('inventory');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [bills, setBills] = useState<PharmacyBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentLogs, setAgentLogs] = useState<any[]>([]);

  // Restock / Add Medicine Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockForm, setRestockForm] = useState({
    name: '',
    genericName: '',
    category: 'Analgesic / Antipyretic',
    pricePerUnit: 15,
    quantity: 100,
    rack: 4,
    column: 3,
    row: 5,
    expiryDate: '2028-12-31',
    batchNumber: '',
  });

  // Billing Counter State - synced from Central Patient Profile
  const [patientName, setPatientName] = useState(() => {
    const p = getPatientProfile();
    return p?.name || 'Ramesh Kumar Sharma';
  });
  const [patientPhone, setPatientPhone] = useState(() => {
    const p = getPatientProfile();
    return p?.phone || '+91 98765 43210';
  });
  const [patientEmail, setPatientEmail] = useState(() => {
    const p = getPatientProfile();
    return p?.email || 'ramesh.sharma@example.com';
  });
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Ayushman Bharat (Subsidized)'>('Ayushman Bharat (Subsidized)');
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiTimer, setUpiTimer] = useState(300); // 5 mins countdown
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([
    {
      medicineId: 'med_001',
      medicineName: 'Paracetamol 650mg (Dolo)',
      quantity: 10,
      unitPrice: 2.5,
      totalPrice: 25,
    },
  ]);
  const [applyDiscount25, setApplyDiscount25] = useState(false);
  const [billSuccess, setBillSuccess] = useState<PharmacyBill | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setMedicines(getMedicines());
    setBills(getPharmacyBills());
    const all = getAgentAuditLogs();
    const filtered = all.filter((l) => l.senderAgent === 'pharm_agent' || l.recipientAgent === 'pharm_agent' || l.senderAgent === 'billing_agent');
    setAgentLogs(filtered.slice(-15).reverse());
  };

  useEffect(() => {
    loadData();
    const unsub = agentBus.onMessage(() => {
      loadData();
    });
    const handleTab = (e: any) => {
      if (e.detail?.tab && ['inventory', 'billing', 'history', 'agent'].includes(e.detail.tab)) {
        setActiveTab(e.detail.tab);
      }
    };
    const handleProfileUpdate = (e: any) => {
      const p = e.detail || getPatientProfile();
      if (p) {
        if (p.name) setPatientName(p.name);
        if (p.phone) setPatientPhone(p.phone);
        if (p.email) setPatientEmail(p.email);
      }
    };
    const handleMedsUpdated = () => {
      loadData();
    };
    window.addEventListener('mediguide:pharmacy-tab', handleTab);
    window.addEventListener('mediguide:profile-updated', handleProfileUpdate);
    window.addEventListener('mediguide:medicines-updated', handleMedsUpdated);
    return () => {
      unsub();
      window.removeEventListener('mediguide:pharmacy-tab', handleTab);
      window.removeEventListener('mediguide:profile-updated', handleProfileUpdate);
      window.removeEventListener('mediguide:medicines-updated', handleMedsUpdated);
    };
  }, []);

  // UPI Countdown Timer
  useEffect(() => {
    if (paymentMethod !== 'UPI') return;
    setUpiTimer(300);
    const interval = setInterval(() => {
      setUpiTimer((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentMethod]);

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.name.trim()) {
      alert('Please enter medicine name');
      return;
    }
    const updated = restockOrAddMedicine({
      name: restockForm.name.trim(),
      genericName: restockForm.genericName.trim() || restockForm.name.trim(),
      category: restockForm.category,
      pricePerUnit: Number(restockForm.pricePerUnit),
      quantity: Number(restockForm.quantity),
      rack: Number(restockForm.rack),
      column: Number(restockForm.column),
      row: Number(restockForm.row),
    });

    // Notify receptionist AI via agentBus
    agentBus.dispatch(
      'pharm_agent',
      'user_receptionist_agent',
      'STOCK_RESTOCKED_ALERT',
      {
        medicine: updated.name,
        quantityAdded: restockForm.quantity,
        totalStock: updated.availableQuantity,
        location: updated.location,
      },
      `Restocked ${updated.name} (+${restockForm.quantity} units). Warehouse: ${updated.location}. Total Stock: ${updated.availableQuantity}.`
    );

    loadData();
    setShowRestockModal(false);
    confetti({ particleCount: 70, spread: 60 });
  };

  // Filtered medicines
  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = medicines.map((m) => ({
      ID: m.id,
      MedicineName: m.name,
      GenericFormulation: m.genericName,
      Category: m.category,
      BatchNumber: m.batchNumber,
      PricePerUnitINR: m.pricePerUnit,
      AvailableStock: m.availableQuantity,
      MinimumThreshold: m.minimumThreshold,
      ExpiryDate: m.expiryDate,
      Manufacturer: m.manufacturer,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'JanAushadhiStock');
    XLSX.writeFile(wb, `JanAushadhi_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Upload Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length > 0) {
          const imported: Medicine[] = data.map((d, i) => ({
            id: d.ID || `med_imp_${Date.now()}_${i}`,
            name: d.MedicineName || d.name || 'Generic Medicine',
            genericName: d.GenericFormulation || d.genericName || 'Formula',
            category: d.Category || d.category || 'General',
            batchNumber: d.BatchNumber || d.batchNumber || 'BATCH-' + Math.floor(1000 + Math.random() * 9000),
            pricePerUnit: Number(d.PricePerUnitINR || d.pricePerUnit || 10),
            availableQuantity: Number(d.AvailableStock || d.availableQuantity || 100),
            minimumThreshold: Number(d.MinimumThreshold || d.minimumThreshold || 20),
            expiryDate: d.ExpiryDate || d.expiryDate || '2027-12-31',
            manufacturer: d.Manufacturer || d.manufacturer || 'Jan Aushadhi Pharma',
            hospitalId: 'hosp_del_01',
          }));

          saveMedicines(imported);
          loadData();
          confetti({ particleCount: 70, spread: 60 });
          alert(`Successfully imported ${imported.length} medicine records from Excel sheet!`);
        }
      } catch (err) {
        console.error('Failed to parse Excel file', err);
        alert('Could not parse Excel file. Please ensure standard spreadsheet formatting.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add Item to Bill
  const handleAddItemToBill = (med: Medicine) => {
    const existing = selectedItems.find((i) => i.medicineId === med.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.medicineId === med.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          medicineId: med.id,
          medicineName: `${med.name} (${med.genericName})`,
          quantity: 1,
          unitPrice: med.pricePerUnit,
          totalPrice: med.pricePerUnit,
        },
      ]);
    }
  };

  // Remove Item from Bill
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = selectedItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const gstAmount = subtotal * 0.05;
  const discountAmount = applyDiscount25 ? subtotal * 0.25 : 0;
  const grandTotal = Math.max(0, subtotal + gstAmount - discountAmount);

  // Generate & Dispatch Bill
  const handleGenerateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Please add at least one medicine to the bill.');
      return;
    }

    const billNumber = `JAB-${Math.floor(100000 + Math.random() * 900000)}`;

    // Auto-deduct stock
    const currentMeds = getMedicines();
    selectedItems.forEach((item) => {
      let target = currentMeds.find((m) => m.id === item.medicineId);
      if (!target && (item.medicineId === 'med_01' || item.medicineId === 'med_001')) {
        target = currentMeds.find((m) => m.id === 'med_001' || m.id === 'med_01');
      }
      if (!target) {
        const lowerItem = (item.medicineName || '').toLowerCase();
        target = currentMeds.find((m) => {
          const medName = m.name.toLowerCase();
          const genName = (m.genericName || '').toLowerCase();
          return (
            lowerItem.includes(medName) ||
            medName.includes(lowerItem) ||
            (lowerItem.includes('dolo') && (medName.includes('dolo') || genName.includes('paracetamol'))) ||
            (lowerItem.includes('paracetamol') && (medName.includes('paracetamol') || genName.includes('paracetamol')))
          );
        });
      }
      if (target) {
        target.availableQuantity = Math.max(0, target.availableQuantity - item.quantity);
        if (target.availableQuantity <= target.minimumThreshold) {
          agentBus.triggerLowStockAlert(target);
        }
      }
    });
    saveMedicines(currentMeds);
    setMedicines([...currentMeds]);

    const newBill: PharmacyBill = {
      id: 'bill_' + Date.now(),
      billNumber,
      hospitalId: 'hosp_del_01',
      hospitalName: 'AIIMS New Delhi',
      hospitalCode: 'AIIMS-DEL-01',
      hospitalAddress: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029',
      hospitalGst: '07AAAGA0001A1Z5',
      patientId: 'usr_pat_001',
      patientName,
      patientEmail,
      patientWhatsApp: patientPhone,
      doctorName: 'Dr. Rajesh Sundaram, MD',
      items: selectedItems,
      subtotal,
      gstAmount,
      discountAmount,
      grandTotal,
      paymentMethod,
      timestamp: new Date().toISOString(),
      sentToWhatsApp: true,
      sentToEmail: true,
    };

    addPharmacyBill(newBill);

    // Agent dispatch
    agentBus.dispatch(
      'billing_agent',
      'user_agent',
      'DISPENSE_BILL_GENERATED',
      { billId: newBill.id, billNumber: newBill.billNumber, total: newBill.grandTotal },
      `Subsidized pharmacy bill ${newBill.billNumber} (₹${newBill.grandTotal.toFixed(2)}) dispatched to ${newBill.patientName}.`
    );

    setBillSuccess(newBill);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    loadData();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <Pill className="w-3.5 h-3.5 text-emerald-400" />
              <span>pharm_agent & billing_agent Active</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('pharm_portal_title', 'Jan Aushadhi Public Pharmacy & Smart Billing')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) • Central Dispensary AIIMS New Delhi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('billing')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              {t('pharm_create_bill_btn', 'Create Customer Bill')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Pill className="w-4 h-4" />
          {t('pharm_inventory_tab', 'Medicine Inventory')} ({medicines.length})
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'billing'
              ? 'bg-teal-600/20 border border-teal-500/40 text-teal-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Receipt className="w-4 h-4" />
          {t('pharm_billing_tab', 'Smart Billing Counter')}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Download className="w-4 h-4" />
          {t('pharm_history_tab', 'Bills History & PDF Dispatch')} ({bills.length})
        </button>

        <button
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'agent'
              ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          {t('pharm_agent_tab', 'pharm_agent & billing_agent Terminal')}
        </button>
      </div>

      {/* Tab 1: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search generic salt or brand name..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowRestockModal(true)}
                className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/40 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                Add / Restock Medicine
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                {t('pharm_upload_excel', 'Upload Excel Sheet')}
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                {t('pharm_export_stock', 'Export Stock')}
              </button>
            </div>
          </div>

          {/* Medicines Grid / Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400">
                    <th className="p-4 font-semibold">Medicine & Generic Name</th>
                    <th className="p-4 font-semibold">Warehouse Location</th>
                    <th className="p-4 font-semibold">Batch</th>
                    <th className="p-4 font-semibold text-right">Price (INR)</th>
                    <th className="p-4 font-semibold text-center">Available Stock</th>
                    <th className="p-4 font-semibold">Expiry Date</th>
                    <th className="p-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredMedicines.map((m) => {
                    const isLow = m.availableQuantity <= m.minimumThreshold;
                    const loc = m.location || (m.rack ? `${m.rack}th rack, ${m.column}rd column, ${m.row}th row` : '4th rack, 3rd column, 5th row');
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-4">
                          <div className="font-semibold text-white">{m.name}</div>
                          <div className="text-[11px] text-slate-400">{m.genericName}</div>
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono text-[11px]">
                            <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                            <span>{loc}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Rack {m.rack || 4} • Col {m.column || 3} • Row {m.row || 5}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{m.batchNumber}</td>
                        <td className="p-4 text-right font-medium text-emerald-400">₹{m.pricePerUnit.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                              isLow
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            {m.availableQuantity} units
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{m.expiryDate}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              handleAddItemToBill(m);
                              setActiveTab('billing');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Bill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Billing Counter */}
      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer & Items (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGenerateBill} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <h3 className="font-bold text-white text-base flex items-center gap-2 pb-3 border-b border-slate-800">
                <Receipt className="w-4 h-4 text-emerald-400" />
                {t('pharm_issue_bill_title', 'Issue Jan Aushadhi Dispensation Invoice')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">WhatsApp Mobile</label>
                  <input
                    type="text"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Items Selected */}
              <div className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Medicines to Dispense ({selectedItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white max-w-xs focus:border-emerald-500"
                      onChange={(e) => {
                        const m = medicines.find(med => med.id === e.target.value);
                        if (m) {
                          handleAddItemToBill(m);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Add from Stock...</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.availableQuantity} in stock - ₹{m.pricePerUnit})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-emerald-500/50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('pharm_add_medicine', 'Add Medicine')}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {selectedItems.map((item, idx) => {
                    const medObj = medicines.find((m) => m.id === item.medicineId);
                    const locText = medObj?.location || (medObj?.rack ? `${medObj.rack}th rack, ${medObj.column}rd column, ${medObj.row}th row` : '4th rack, 3rd column, 5th row');
                    return (
                      <div
                        key={idx}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white">{item.medicineName}</div>
                          <div className="text-slate-400 text-[11px]">₹{item.unitPrice} per unit</div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono text-[11px] mt-1.5">
                            <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                            <span>Shelf Location: <strong className="text-white">{locText}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[11px]">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = Math.max(1, parseInt(e.target.value) || 1);
                                const updated = [...selectedItems];
                                updated[idx].quantity = qty;
                                updated[idx].totalPrice = qty * item.unitPrice;
                                setSelectedItems(updated);
                              }}
                              className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                            />
                          </div>

                          <span className="font-bold text-white w-16 text-right">
                            ₹{item.totalPrice.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Mode & Compensation Waiver */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value as any);
                      setUpiVerified(false);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Ayushman Bharat (Subsidized)">Ayushman Bharat (Govt Subsidized)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash Counter</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyDiscount25}
                      onChange={(e) => setApplyDiscount25(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    />
                    <span>Apply 25% Emergency Override Waiver</span>
                  </label>
                </div>
              </div>

              {/* Interactive UPI QR Code Demo */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 bg-slate-950/90 border border-teal-500/40 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
                      <QrCode className="w-4 h-4" />
                      <span>Interactive NPCI / BHIM UPI Gateway</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      <span>Expires in {Math.floor(upiTimer / 60)}:{String(upiTimer % 60).padStart(2, '0')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                    {/* Simulated QR Code */}
                    <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-lg flex flex-col items-center justify-center shrink-0 relative">
                      <div className="w-full h-full border-2 border-dashed border-slate-800 rounded flex flex-col items-center justify-center relative overflow-hidden bg-slate-50">
                        <div className="absolute inset-1 grid grid-cols-6 grid-rows-6 gap-0.5 opacity-90">
                          {Array.from({ length: 36 }).map((_, i) => (
                            <div
                              key={i}
                              className={`${
                                i % 2 === 0 || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35
                                  ? 'bg-slate-900'
                                  : 'bg-transparent'
                              } rounded-[1px]`}
                            />
                          ))}
                        </div>
                        <div className="z-10 bg-white p-1 rounded-full shadow border border-slate-300">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="text-xs text-slate-300">
                        Scan with Any UPI App: <strong className="text-white">GPay, PhonePe, Paytm, BHIM</strong>
                      </div>
                      <div className="font-mono text-[11px] text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20 inline-block">
                        mediguide.janaushadhi@gov.in
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Beneficiary: <span className="text-slate-200">AIIMS Central Jan Aushadhi Dispensary</span>
                      </div>
                      <div className="text-sm font-bold text-emerald-400">
                        Payable: ₹{grandTotal.toFixed(2)}
                      </div>

                      {upiVerified ? (
                        <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg flex items-center justify-center sm:justify-start gap-2 text-emerald-300 text-xs font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>UPI Verified (Ref: UPI/{Date.now().toString().slice(-6)})</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUpiVerified(true);
                            confetti({ particleCount: 50, spread: 60 });
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Simulate UPI App Scan & Approval
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xl shadow-emerald-900/40 cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  {t('pharm_gen_bill_btn', 'Generate Official PDF Bill & Transmit via billing_agent')}
                </button>
              </div>
            </form>
          </div>

          {/* Invoice Summary Card (1 col) */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h4 className="font-bold text-white text-sm pb-3 border-b border-slate-800">
                Live Invoice Calculation
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="text-white">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST / Levies (5%):</span>
                  <span className="text-white">₹{gstAmount.toFixed(2)}</span>
                </div>
                {applyDiscount25 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Emergency 25% Waiver:</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-800 flex justify-between text-base font-bold text-white">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                Generating this invoice transmits real-time dispatch events to the patient’s WhatsApp and patient portal via billing_agent.
              </div>
            </div>

            {billSuccess && (
              <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Invoice {billSuccess.billNumber} Created!</h4>
                <p className="text-xs text-slate-300">
                  Dispatched to {billSuccess.patientName} ({billSuccess.patientWhatsApp})
                </p>

                {/* Instant WhatsApp & Email Action Links */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://wa.me/${billSuccess.patientWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste ${billSuccess.patientName}, your official Jan Aushadhi Medical Bill ${billSuccess.billNumber} for ₹${billSuccess.grandTotal.toFixed(2)} is generated at AIIMS New Delhi. Thank you!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:${billSuccess.patientEmail}?subject=${encodeURIComponent(`Jan Aushadhi Bill ${billSuccess.billNumber} - AIIMS New Delhi`)}&body=${encodeURIComponent(`Dear ${billSuccess.patientName},\n\nPlease find your pharmacy dispensation receipt ${billSuccess.billNumber} for ₹${billSuccess.grandTotal.toFixed(2)}.\n\nHealth Desk AIIMS New Delhi`)}`}
                    className="py-2 px-3 bg-sky-700/40 hover:bg-sky-700/60 border border-sky-500/40 text-sky-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    Email
                  </a>
                </div>

                <button
                  onClick={() => downloadHospitalBillPdf(billSuccess)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  {t('pharm_download_branded', 'Download Branded PDF Receipt')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {bill.billNumber}
                  </span>
                  <span className="font-bold text-white text-sm">{bill.patientName}</span>
                  <span className="text-xs text-slate-400">({bill.patientWhatsApp})</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>{new Date(bill.timestamp).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{bill.items.length} items</span>
                  <span>•</span>
                  <span>Mode: {bill.paymentMethod}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-white text-lg">₹{bill.grandTotal.toFixed(2)}</span>
                <button
                  onClick={() => downloadHospitalBillPdf(bill)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Agent Terminal */}
      {activeTab === 'agent' && (
        <div className="bg-black/80 border border-slate-800 rounded-2xl p-5 shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">pharm_agent & billing_agent Live Bus Telemetry</span>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {agentLogs.length === 0 ? (
              <div className="text-slate-600 italic py-4 text-center">
                Awaiting pharmacy bus activity...
              </div>
            ) : (
              agentLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
                  <span className="text-emerald-400 font-semibold shrink-0">
                    [{log.senderAgent} ➔ {log.recipientAgent}]
                  </span>
                  <span className="text-slate-300 flex-1">{log.payloadSummary}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Restock Medicine Modal with Physical Coordinates */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Add / Restock Medicine with Shelf Location</span>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Medicine Brand Name</label>
                <input
                  type="text"
                  required
                  value={restockForm.name}
                  onChange={(e) => setRestockForm({ ...restockForm, name: e.target.value })}
                  placeholder="e.g. Dolo 650mg / Amoxicillin 500mg"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Generic Salt / Formulation</label>
                <input
                  type="text"
                  value={restockForm.genericName}
                  onChange={(e) => setRestockForm({ ...restockForm, genericName: e.target.value })}
                  placeholder="e.g. Paracetamol IP 650mg"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Category</label>
                  <input
                    type="text"
                    value={restockForm.category}
                    onChange={(e) => setRestockForm({ ...restockForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    value={restockForm.pricePerUnit}
                    onChange={(e) => setRestockForm({ ...restockForm, pricePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Quantity to Restock / Add (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm({ ...restockForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Physical Warehouse Coordinates */}
              <div className="p-3.5 bg-slate-950/80 border border-teal-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-semibold">
                  <MapPin className="w-4 h-4" />
                  <span>Physical Warehouse Coordinates</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Rack #</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={restockForm.rack}
                      onChange={(e) => setRestockForm({ ...restockForm, rack: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Column #</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={restockForm.column}
                      onChange={(e) => setRestockForm({ ...restockForm, column: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Row #</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={restockForm.row}
                      onChange={(e) => setRestockForm({ ...restockForm, row: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center text-white font-mono"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-teal-300 bg-teal-500/10 p-2 rounded border border-teal-500/20">
                  Location String: <strong>{restockForm.rack}th rack, {restockForm.column}rd column, {restockForm.row}th row</strong>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-900/40"
                >
                  Save & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
