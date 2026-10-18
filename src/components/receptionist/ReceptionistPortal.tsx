import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  Send,
  AlertCircle,
  TrendingUp,
  Search,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

import confetti from 'canvas-confetti';
import { getHospitals, getMedicines, updateMedicine, getAppointments, getActiveAuthSession } from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { Hospital, Doctor } from '../../types/hospital';
import { Medicine } from '../../types/pharmacy';
import { useLanguage } from '../../context/LanguageContext';

export const ReceptionistPortal: React.FC = () => {
  const { t } = useLanguage();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('hosp_del_01');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointments, setAppointments] = useState(getAppointments());
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  // Doctor search by ID / Name state
  const [docSearchInput, setDocSearchInput] = useState('');
  const [searchedDoctor, setSearchedDoctor] = useState<Doctor | null>(null);

  const session = getActiveAuthSession();
  const isStaffSession = session.role === 'receptionist' && !!session.hospitalStaff?.hospitalId;
  const lockedHospitalId = session.hospitalStaff?.hospitalId;
  const effectiveHospitalId = isStaffSession ? lockedHospitalId! : selectedHospitalId;

  const loadData = () => {
    const hosps = getHospitals();
    setHospitals(hosps);
    if (hosps.length > 0 && !selectedHospitalId) {
      setSelectedHospitalId(hosps[0].id);
    }
    setMedicines(getMedicines());
    setAppointments(getAppointments());
  };

  useEffect(() => {
    loadData();
    const unsub = agentBus.onMessage(() => {
      loadData();
    });
    const handleProfileUpdate = () => {
      loadData();
    };
    window.addEventListener('mediguide:profile-updated', handleProfileUpdate);
    return () => {
      unsub();
      window.removeEventListener('mediguide:profile-updated', handleProfileUpdate);
    };
  }, []);

  const currentHospital = hospitals.find((h) => h.id === effectiveHospitalId) || hospitals[0];
  const doctors = currentHospital?.doctors || [];

  // Scoped Data Isolation: only appointments and medicines for this hospital
  const hospitalAppointments = appointments.filter((a) => a.hospitalId === currentHospital?.id);
  const hospitalMedicines = medicines.filter((m) => m.hospitalId === currentHospital?.id || !m.hospitalId);

  // Toggle Doctor Check-in
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (doctors.length > 0 && Object.keys(attendance).length === 0) {
      const initial: Record<string, boolean> = {};
      doctors.forEach((d) => {
        initial[d.id] = d.status === 'Checked In';
      });
      setAttendance(initial);
    }
  }, [doctors]);

  const toggleCheckIn = (doctorId: string, doctorName: string) => {
    const isNowCheckedIn = !attendance[doctorId];
    setAttendance((prev) => ({ ...prev, [doctorId]: isNowCheckedIn }));

    agentBus.dispatch(
      'res_agent',
      'doc_schd_agent',
      isNowCheckedIn ? 'DOCTOR_CHECK_IN' : 'DOCTOR_CHECK_OUT',
      { doctorId, doctorName, status: isNowCheckedIn ? 'Present' : 'Away' },
      `Doctor ${doctorName} marked as ${isNowCheckedIn ? 'CHECKED IN (Present)' : 'CHECKED OUT'} by receptionist.`
    );
  };

  // Low stock medicines (strictly for this hospital)
  const lowStockItems = hospitalMedicines.filter((m) => m.availableQuantity <= m.minimumThreshold);

  const handleAcknowledgeReorder = (item: Medicine) => {
    updateMedicine(item.id, { availableQuantity: item.availableQuantity + 200 });
    setReorderSuccessMsg(`Emergency reorder placed with Central Jan Aushadhi Depot for ${item.name} (+200 units).`);
    confetti({ particleCount: 50, spread: 45 });
    setTimeout(() => setReorderSuccessMsg(null), 3500);

    agentBus.dispatch(
      'res_agent',
      'pharm_agent',
      'STOCK_REORDER_CONFIRMED',
      { medicineId: item.id, name: item.name, addedUnits: 200 },
      `Receptionist acknowledged low stock. 200 units of ${item.name} replenished directly to Jan Aushadhi dispensary.`
    );
  };

  const checkedInCount = Object.values(attendance).filter(Boolean).length;
  // Revenue calculation scoped exclusively to this hospital
  const todayRevenue = (hospitalAppointments.length * (currentHospital?.estimatedConsultationCost || 10)) + 4200;

  // Real-time doctor clinical status calculation
  const getDoctorRealtimeStatus = (doc: Doctor) => {
    const isCheckedIn = !!attendance[doc.id];
    if (!isCheckedIn || doc.status === 'On Leave') {
      return {
        badge: '🔴 On Leave / Checked Out',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        detail: 'Physician is not currently checked in or is on medical leave today.',
        isBusy: false,
      };
    }
    const activeApt = hospitalAppointments.find(
      (a) =>
        (a.doctorId === doc.id || a.doctorName.toLowerCase().includes(doc.name.toLowerCase())) &&
        (a.status === 'Accepted' || a.status === 'Pending')
    );
    if (activeApt) {
      return {
        badge: '🟡 Busy with Consultation',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        detail: `Currently consulting with patient ${activeApt.patientName} (Slot ${activeApt.timeSlot}, ID: ${activeApt.id}).`,
        isBusy: true,
        patientName: activeApt.patientName,
      };
    }
    return {
      badge: '🟢 Available / On-Duty',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      detail: `Checked in and available for OPD consultations in Room ${(doc as any).roomNumber || '102'}.`,
      isBusy: false,
    };
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-teal-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-3">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>user_receptionist_agent & res_agent Live</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('rec_portal_title', 'Hospital Reception & Front-Desk Operations')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {currentHospital?.name} ({currentHospital?.uniqueCode}) • Front Desk OPD Terminal
            </p>
          </div>

          {/* Hospital Switcher or Locked Facility Badge */}
          <div className="flex items-center gap-3">
            {isStaffSession ? (
              <div className="px-3.5 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Facility: {currentHospital?.name} (Restricted)</span>
              </div>
            ) : (
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">{t('rec_doctors_checked_in', 'Doctors Checked In:')}</span>
            <Stethoscope className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {checkedInCount} / {doctors.length}
          </div>
          <span className="text-[11px] text-teal-400 mt-1 block">Active across OPD consultation rooms</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">{t('rec_today_rev', "Today's Total Revenue")}</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹{todayRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Includes OPD registration fees</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">{t('rec_monthly_income', 'Monthly OPD Income')}</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹3,42,800</div>
          <span className="text-[11px] text-blue-400 mt-1 block">Subsidized state healthcare fund</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">{t('rec_staff_payroll', 'Staff Payroll (Monthly)')}</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹14,50,000</div>
          <span className="text-[11px] text-indigo-400 mt-1 block">Doctors, nurses & medical staff</span>
        </div>
      </div>

      {/* Main Grid: Doctor Roster & Pharmacy Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Roster & Check-in (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-400" />
                {t('rec_doctor_roster', 'Doctor On-Duty Roster & Attendance')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Toggle live presence to update patient appointment availability</p>
            </div>
            <span className="text-xs text-slate-400">
              {checkedInCount} of {doctors.length} {t('rec_present', 'Present')}
            </span>
          </div>

          {/* Doctor ID Search & Real-time Status Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearchInput}
                  onChange={(e) => setDocSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const found = doctors.find(
                        (d) =>
                          d.id.toLowerCase() === docSearchInput.trim().toLowerCase() ||
                          d.name.toLowerCase().includes(docSearchInput.trim().toLowerCase()) ||
                          d.specialty.toLowerCase().includes(docSearchInput.trim().toLowerCase())
                      );
                      setSearchedDoctor(found || null);
                    }
                  }}
                  placeholder="Search Doctor by ID (e.g. doc_del_01) or Name..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const found = doctors.find(
                    (d) =>
                      d.id.toLowerCase() === docSearchInput.trim().toLowerCase() ||
                      d.name.toLowerCase().includes(docSearchInput.trim().toLowerCase()) ||
                      d.specialty.toLowerCase().includes(docSearchInput.trim().toLowerCase())
                  );
                  setSearchedDoctor(found || null);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-teal-950/40"
              >
                <Search className="w-3.5 h-3.5" />
                Check Status
              </button>
            </div>

            {/* Quick Doctor ID Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-slate-500">Quick Doctor IDs:</span>
              {doctors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDocSearchInput(d.id);
                    setSearchedDoctor(d);
                  }}
                  className={`px-2 py-0.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    searchedDoctor?.id === d.id
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {d.id} ({d.name.split(' ')[1] || d.name})
                </button>
              ))}
            </div>

            {/* Queried Doctor Status Dossier */}
            {searchedDoctor && (() => {
              const statusInfo = getDoctorRealtimeStatus(searchedDoctor);
              return (
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-teal-500/30 rounded-xl p-4 space-y-3 mt-2 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-sm">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{searchedDoctor.name}</h4>
                          <code className="text-[11px] text-teal-300 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                            {searchedDoctor.id}
                          </code>
                        </div>
                        <p className="text-xs text-slate-400">
                          {searchedDoctor.specialty} • Room {(searchedDoctor as any).roomNumber || '102'} • {searchedDoctor.qualifications}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                      {statusInfo.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/40 border border-slate-800 rounded-lg p-2.5">
                    {statusInfo.detail}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('mediguide:ask-assistant', {
                            detail: { query: `Search doctor ${searchedDoctor.id} status and schedule` },
                          })
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white flex items-center gap-1.5 cursor-pointer shadow transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask Reception Desk AI to Inquire
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchedDoctor(null);
                        setDocSearchInput('');
                      }}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="divide-y divide-slate-800/80">
            {doctors.map((doc) => {
              const isCheckedIn = !!attendance[doc.id];
              return (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{doc.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 font-medium">
                        {doc.specialty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Room {(doc as any).roomNumber || '102'}</span>
                      <span>•</span>
                      <span>{doc.qualifications}</span>
                      <span>•</span>
                      <span>{doc.experienceYears} yrs exp</span>
                    </div>

                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        isCheckedIn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                      />
                      {isCheckedIn ? 'Checked In' : 'Checked Out'}
                    </span>

                    <button
                      onClick={() => toggleCheckIn(doc.id, doc.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isCheckedIn
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-900/30'
                      }`}
                    >
                      {isCheckedIn
                        ? t('rec_mark_checkout', 'Mark Checked Out')
                        : t('rec_mark_checkin', 'Mark Checked In')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pharmacy Low-Stock & Reorder Alerts (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                {t('rec_pharmacy_alerts', 'Pharmacy Restock Alerts')}
              </h3>

              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
                {lowStockItems.length} Urgent
              </span>
            </div>

            {reorderSuccessMsg && (
              <div className="p-3 my-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reorderSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3 mt-3">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">All essential medicines stocked above threshold levels.</p>
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-800/70 border border-amber-500/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-white text-xs">{item.name}</h4>
                        <span className="text-[11px] text-slate-400">{item.genericName}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {item.availableQuantity} left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                      <span>Threshold: {item.minimumThreshold} units</span>
                      <button
                        onClick={() => handleAcknowledgeReorder(item)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] shadow cursor-pointer transition-all"
                      >
                        {t('rec_acknowledge_reorder', 'Acknowledge & Place Jan Aushadhi Reorder')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 italic">
            Connected via pharm_agent and res_agent autonomous telemetry.
          </div>
        </div>
      </div>
    </div>
  );
};
