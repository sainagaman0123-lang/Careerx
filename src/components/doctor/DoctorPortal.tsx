import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  KeyRound,
  Plus,
  Activity,
  FileText,
  Building2,
  ChevronRight,
  ShieldCheck,
  Send,
  Pill,
  Eye,
  Copy,
  Sparkles,
  Phone,
  X,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAppointments, getMedicalCourses, updateAppointment, getUserProfile, getHospitals } from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { Appointment, MedicalCourse, PrescribedMedicine } from '../../types/appointment';
import { downloadPrescriptionPdf } from '../../services/pdfGenerator';
import { DoctorAnalytics } from './DoctorAnalytics';
import { DoctorScheduleAgent } from './DoctorScheduleAgent';
import { useLanguage } from '../../context/LanguageContext';

export const DoctorPortal: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'queue' | 'courses' | 'analytics' | 'agent'>('queue');
  const [newlyCreatedCourse, setNewlyCreatedCourse] = useState<MedicalCourse | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [courses, setCourses] = useState<MedicalCourse[]>([]);

  // Appointment Details Modal
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Pass Code Validation Modal
  const [selectedCourseForPass, setSelectedCourseForPass] = useState<MedicalCourse | null>(null);
  const [selectedAppointmentForPass, setSelectedAppointmentForPass] = useState<Appointment | null>(null);
  const [passCodeInput, setPassCodeInput] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // Reject Modal
  const [rejectAppointmentId, setRejectAppointmentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Emergency Modal
  const [emergencyAptId, setEmergencyAptId] = useState<string | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('Urgent surgical trauma case received in emergency bay');

  // Initiate Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    patientName: 'Aarav Sharma',
    patientId: 'usr_patient_demo',
    diagnosis: 'Hypertensive Episode with Mild Vertigo',
    department: 'General Medicine',
    notes: 'Rest for 3 days. Reduce sodium intake and check BP twice weekly.',
    nextFollowUpDate: '2026-10-10',
  });
  const [prescriptions, setPrescriptions] = useState<PrescribedMedicine[]>([
    {
      id: 'med_init_1',
      name: 'Amlodipine Besylate 5mg',
      dosage: '1 tablet once daily',
      frequency: 'Once Daily',
      timing: { morning: true, afternoon: false, night: false },
      durationDays: 14,
      instructions: 'Take after breakfast',
    },
    {
      id: 'med_init_2',
      name: 'Paracetamol 650mg',
      dosage: '1 tablet SOS',
      frequency: 'SOS (As Needed)',
      timing: { morning: false, afternoon: false, night: true },
      durationDays: 5,
      instructions: 'Take only if temperature or headache occurs',
    },
  ]);

  const loadData = () => {
    setAppointments(getAppointments());
    setCourses(getMedicalCourses());
  };

  useEffect(() => {
    loadData();
    const unsub = agentBus.onMessage(() => {
      loadData();
    });
    const handleTab = (e: any) => {
      if (e.detail?.tab && ['queue', 'courses', 'analytics', 'agent'].includes(e.detail.tab)) {
        setActiveTab(e.detail.tab);
      }
    };
    const handleOpenDetails = (e: any) => {
      if (e.detail?.appointmentId) {
        const apts = getAppointments();
        const target = apts.find((a) => a.id.toLowerCase() === e.detail.appointmentId.toLowerCase());
        if (target) {
          setSelectedAppointmentForDetails(target);
          setActiveTab('queue');
        }
      }
    };
    const handleProfileUpdate = () => {
      loadData();
    };
    window.addEventListener('mediguide:doctor-tab', handleTab);
    window.addEventListener('mediguide:open-appointment-details', handleOpenDetails);
    window.addEventListener('mediguide:profile-updated', handleProfileUpdate);
    return () => {
      unsub();
      window.removeEventListener('mediguide:doctor-tab', handleTab);
      window.removeEventListener('mediguide:open-appointment-details', handleOpenDetails);
      window.removeEventListener('mediguide:profile-updated', handleProfileUpdate);
    };
  }, []);

  // Accept Appointment
  const handleAcceptAppointment = (aptId: string) => {
    updateAppointment(aptId, { status: 'Accepted' });
    loadData();
  };

  // Reject Appointment
  const handleRejectAppointment = () => {
    if (!rejectAppointmentId) return;
    updateAppointment(rejectAppointmentId, {
      status: 'Rejected',
      rejectionReason: rejectReason || 'Doctor unavailable during this slot.',
    });
    setRejectAppointmentId(null);
    setRejectReason('');
    loadData();
  };

  // Emergency Override
  const handleConfirmEmergency = () => {
    if (!emergencyAptId) return;
    agentBus.triggerEmergencyOverride(emergencyAptId, emergencyReason);
    setEmergencyAptId(null);
    loadData();
  };

  // Verify Pass Code for Course or Consultation
  const handleVerifyPassCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (selectedCourseForPass) {
      const res = agentBus.verifyAndEndCourse(selectedCourseForPass.id, passCodeInput);
      if (res.success) {
        setPassSuccess(res.message);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setTimeout(() => {
          setSelectedCourseForPass(null);
          setPassCodeInput('');
          setPassSuccess(null);
          loadData();
        }, 1800);
      } else {
        setPassError(res.message);
      }
    } else if (selectedAppointmentForPass) {
      if (selectedAppointmentForPass.passCode.trim().toUpperCase() === passCodeInput.trim().toUpperCase()) {
        updateAppointment(selectedAppointmentForPass.id, { status: 'Completed' });
        setPassSuccess('Appointment pass code verified! Consultation concluded successfully.');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setTimeout(() => {
          setSelectedAppointmentForPass(null);
          setPassCodeInput('');
          setPassSuccess(null);
          loadData();
        }, 1800);
      } else {
        setPassError('Invalid Consultation Pass Code! Please ask patient for the exact PASS-XXXX shown in their MediGuide app.');
      }
    }
  };

  // Add Prescription Medicine
  const handleAddMedicine = () => {
    const newMed: PrescribedMedicine = {
      id: 'med_' + Date.now(),
      name: 'Azithromycin 500mg',
      dosage: '1 tablet once daily',
      frequency: 'Once Daily',
      timing: { morning: true, afternoon: false, night: false },
      durationDays: 5,
      instructions: 'Take after meals',
    };
    setPrescriptions([...prescriptions, newMed]);
  };

  // Initiate Course
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const created = agentBus.startCourse({
      patientId: courseForm.patientId,
      patientName: courseForm.patientName,
      doctorId: 'doc_1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      hospitalId: 'hosp_aiims_delhi',
      hospitalName: 'AIIMS New Delhi',
      department: courseForm.department as any,
      diagnosis: courseForm.diagnosis,
      medicines: prescriptions,
      nextFollowUpDate: courseForm.nextFollowUpDate,
      notes: courseForm.notes,
    });
    setNewlyCreatedCourse(created);
    setShowCourseModal(false);
    loadData();
    confetti({ particleCount: 60, spread: 50 });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Newly Created Course Banner with Prescription Download */}
      {newlyCreatedCourse && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Medical Course Initiated for {newlyCreatedCourse.patientName} ({newlyCreatedCourse.courseCode})
              </h4>
              <p className="text-xs text-slate-400">
                Official prescription generated with verification pass: <span className="font-mono text-emerald-400 font-bold">{newlyCreatedCourse.verificationPassCode}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadPrescriptionPdf(newlyCreatedCourse)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/40 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Prescription (PDF)
            </button>
            <button
              onClick={() => setNewlyCreatedCourse(null)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-blue-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
              <span>doc_agent & doc_schd_agent Connected</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('doc_portal_title', 'Doctor OPD Desk')} - Dr. Rajesh Sharma, MD
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              AIIMS New Delhi • Dept. of Cardiology & Internal Medicine • License: MCI-849201-DL
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('doc_initiate_course', 'Initiate Patient Course')}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t('doc_queue_tab', 'Appointments Queue')} ({appointments.length})
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'courses'
              ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Pill className="w-4 h-4" />
          {t('doc_courses_tab', 'Active Treatment Courses')} ({courses.filter((c) => c.status === 'Active').length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          {t('doc_analytics_tab', 'Clinical Analytics & Graphs')}
        </button>

        <button
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'agent'
              ? 'bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          {t('doc_agent_tab', 'doc_schd_agent Terminal')}
        </button>
      </div>

      {/* Tab 1: Appointments Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <p className="text-slate-400 text-sm">No appointments in the queue.</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointmentForDetails(apt)}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-blue-500/50 hover:bg-slate-900/95 cursor-pointer transition-all group relative"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">
                      {apt.patientName}
                    </span>
                    <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      <Phone className="w-3 h-3" /> {apt.patientPhone}
                    </span>
                    <code className="text-[11px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40">
                      {apt.id}
                    </code>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        apt.status === 'Accepted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : apt.status === 'Completed'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : apt.status === 'Emergency Postponed'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {apt.status}
                    </span>
                    {apt.isEmergencyOverride && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[11px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 25% Voucher Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" /> {apt.appointmentDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {apt.timeSlot}
                    </span>
                    <span>Dept: <strong className="text-slate-200">{apt.department}</strong></span>
                    <span className="text-[11px] text-blue-400/80 font-medium flex items-center gap-1 group-hover:text-blue-300">
                      <Eye className="w-3.5 h-3.5" /> Click card for details
                    </span>
                  </div>

                  {apt.rejectionReason && (
                    <p className="text-xs text-red-400/90 italic bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                      Reason: {apt.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Doctor Actions */}
                <div
                  className="flex flex-wrap items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {apt.status === 'Pending' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptAppointment(apt.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('doc_accept', 'Accept')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectAppointmentId(apt.id);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {t('doc_reject', 'Reject')}
                      </button>
                    </>
                  )}

                  {apt.status !== 'Completed' && apt.status !== 'Cancelled' && apt.status !== 'Rejected' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmergencyAptId(apt.id);
                        }}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        {t('doc_emergency_takeover', 'Emergency Takeover')}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointmentForPass(apt);
                          setSelectedCourseForPass(null);
                          setPassCodeInput('');
                          setPassError(null);
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {t('doc_enter_pass_btn', 'Enter Patient Pass Code & End Course')}
                      </button>
                    </>
                  )}

                  {apt.status === 'Cancelled' && (
                    <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Cancelled by Citizen
                    </span>
                  )}

                  {apt.status === 'Completed' && (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Consultation Concluded
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Active Treatment Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {courses.map((crs) => (
            <div
              key={crs.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-indigo-500/40 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                      {crs.courseCode}
                    </span>
                    <span className="text-white font-bold text-base">{crs.patientName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        crs.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {crs.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300">{crs.diagnosis}</h4>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => downloadPrescriptionPdf(crs)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all shadow-sm"
                    title="Download Official Prescription PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    Rx PDF
                  </button>

                  {crs.status === 'Active' ? (
                    <button
                      onClick={() => {
                        setSelectedCourseForPass(crs);
                        setSelectedAppointmentForPass(null);
                        setPassCodeInput('');
                        setPassError(null);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-900/30 cursor-pointer transition-all"
                    >
                      <KeyRound className="w-4 h-4" />
                      {t('doc_enter_pass_btn', 'Enter Patient Pass Code & End Course')}
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Verified Concluded
                    </div>
                  )}
                </div>
              </div>

              {/* Medicines Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {crs.medicines.map((m) => (
                  <div key={m.id} className="bg-slate-800/50 rounded-xl p-3 text-xs border border-slate-700/50">
                    <div className="font-semibold text-white">{m.name}</div>
                    <div className="text-slate-400 mt-0.5">{m.dosage} • {m.frequency}</div>
                    <div className="text-[11px] text-slate-500 mt-1 italic">{m.instructions}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Analytics */}
      {activeTab === 'analytics' && <DoctorAnalytics appointments={appointments} courses={courses} />}

      {/* Tab 4: Agent Terminal */}
      {activeTab === 'agent' && <DoctorScheduleAgent />}

      {/* Modal: Validate Secret Pass Code */}
      {(selectedCourseForPass || selectedAppointmentForPass) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {t('doc_validate_pass_title', 'Validate Secret Pass Code')}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {selectedCourseForPass ? selectedCourseForPass.patientName : selectedAppointmentForPass?.patientName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCourseForPass(null);
                  setSelectedAppointmentForPass(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer font-bold text-lg"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To officially verify consultation completion and conclude active courses, request the secret pass code
              from the patient’s MediGuide AI mobile screen.
            </p>

            <form onSubmit={handleVerifyPassCode} className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                  Enter Patient Secret Pass Code (e.g. PASS-XXXX)
                </label>
                <input
                  type="text"
                  required
                  placeholder="PASS-1234"
                  value={passCodeInput}
                  onChange={(e) => setPassCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center text-emerald-400 focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              {passError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourseForPass(null);
                    setSelectedAppointmentForPass(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  {t('doc_verify_end_btn', 'Verify Pass Code & Officially End Course')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Emergency Override */}
      {emergencyAptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Emergency Takeover Override</h3>
                <span className="text-xs text-red-400">Autonomous 25% Compensation Voucher</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When an attending doctor is pulled away for critical trauma or surgical emergencies, the MediGuide
              multi-agent system immediately issues an automated 25% compensation discount voucher and priority rescheduling for the patient.
            </p>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Emergency Triage Reason</label>
              <textarea
                rows={3}
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEmergencyAptId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmEmergency}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 cursor-pointer transition-all"
              >
                Confirm Emergency Override & Issue 25% Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Initiate Patient Course */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Initiate Patient Treatment Course</h3>
                  <span className="text-xs text-slate-400">Generates unique Secret Pass Code for patient</span>
                </div>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={courseForm.patientName}
                    onChange={(e) => setCourseForm({ ...courseForm, patientName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={courseForm.department}
                    onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium block mb-1">Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={courseForm.diagnosis}
                    onChange={(e) => setCourseForm({ ...courseForm, diagnosis: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Medicines Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Prescribed Medicines
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>

                <div className="space-y-3">
                  {prescriptions.map((m, idx) => (
                    <div key={m.id} className="bg-slate-800/70 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const updated = [...prescriptions];
                            updated[idx].name = e.target.value;
                            setPrescriptions(updated);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-medium flex-1"
                          placeholder="Medicine name"
                        />
                        <button
                          type="button"
                          onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 font-bold"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <input
                          type="text"
                          value={m.dosage}
                          onChange={(e) => {
                            const updated = [...prescriptions];
                            updated[idx].dosage = e.target.value;
                            setPrescriptions(updated);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300"
                          placeholder="Dosage (e.g. 1 tab)"
                        />
                        <input
                          type="number"
                          value={m.durationDays}
                          onChange={(e) => {
                            const updated = [...prescriptions];
                            updated[idx].durationDays = parseInt(e.target.value) || 1;
                            setPrescriptions(updated);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300"
                          placeholder="Days"
                        />
                        <div className="col-span-2 flex items-center gap-3 text-slate-400 text-[11px]">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.timing.morning}
                              onChange={(e) => {
                                const updated = [...prescriptions];
                                updated[idx].timing.morning = e.target.checked;
                                setPrescriptions(updated);
                              }}
                            />
                            Morning
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.timing.afternoon}
                              onChange={(e) => {
                                const updated = [...prescriptions];
                                updated[idx].timing.afternoon = e.target.checked;
                                setPrescriptions(updated);
                              }}
                            />
                            Noon
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.timing.night}
                              onChange={(e) => {
                                const updated = [...prescriptions];
                                updated[idx].timing.night = e.target.checked;
                                setPrescriptions(updated);
                              }}
                            />
                            Night
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Recommended Follow-up</label>
                  <input
                    type="date"
                    value={courseForm.nextFollowUpDate}
                    onChange={(e) => setCourseForm({ ...courseForm, nextFollowUpDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Clinical Notes</label>
                  <input
                    type="text"
                    value={courseForm.notes}
                    onChange={(e) => setCourseForm({ ...courseForm, notes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/40 cursor-pointer transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Prescribe & Dispatch to user_agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details Dossier Modal */}
      {selectedAppointmentForDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Appointment Dossier
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium uppercase border bg-slate-800 border-slate-700 text-slate-300">
                      {selectedAppointmentForDetails.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Clinical appointment records & citizen details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointmentForDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Citizen Information Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/70 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {selectedAppointmentForDetails.patientName ? selectedAppointmentForDetails.patientName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedAppointmentForDetails.patientName}</h4>
                    <p className="text-xs text-slate-400">Citizen / Patient</p>
                  </div>
                </div>
                {selectedAppointmentForDetails.patientPhone && (
                  <a
                    href={`tel:${selectedAppointmentForDetails.patientPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedAppointmentForDetails.patientPhone}
                  </a>
                )}
              </div>
            </div>

            {/* Appointment Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <span className="text-slate-400 block mb-1">Appointment ID</span>
                <div className="flex items-center justify-between gap-1">
                  <code className="text-blue-300 font-mono font-semibold break-all text-[11px]">
                    {selectedAppointmentForDetails.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedAppointmentForDetails.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    title="Copy Appointment ID"
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <span className="text-slate-400 block mb-1">Date & Time Slot</span>
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{selectedAppointmentForDetails.appointmentDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{selectedAppointmentForDetails.timeSlot}</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <span className="text-slate-400 block mb-1">Department / OPD</span>
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{selectedAppointmentForDetails.department || 'General Medicine'}</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                <span className="text-slate-400 block mb-1">Hospital</span>
                <div className="flex items-center gap-1.5 text-white font-medium truncate">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{selectedAppointmentForDetails.hospitalName || 'Main Hospital'}</span>
                </div>
              </div>
            </div>

            {/* Secret Pass Code Section */}
            {selectedAppointmentForDetails.passCode && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-400 font-semibold block uppercase tracking-wider">
                      Secret Pass Code
                    </span>
                    <span className="text-base font-mono font-bold tracking-widest text-amber-300">
                      {selectedAppointmentForDetails.passCode}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {selectedAppointmentForDetails.status === 'Completed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Verified & Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppointmentForPass(selectedAppointmentForDetails);
                        setSelectedAppointmentForDetails(null);
                      }}
                      className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Verify Pass Code
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Reschedule History Banner if present */}
            {Boolean(
              selectedAppointmentForDetails.status === 'Rescheduled' ||
              selectedAppointmentForDetails.previousAppointmentDate ||
              selectedAppointmentForDetails.previousTimeSlot
            ) && (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <span className="font-semibold">Rescheduled Consultation: </span>
                  Originally booked for {selectedAppointmentForDetails.previousAppointmentDate || 'earlier date'} at {selectedAppointmentForDetails.previousTimeSlot || 'previous slot'}.
                  {selectedAppointmentForDetails.rescheduleReason && (
                    <span className="block text-[11px] text-purple-400/80 mt-0.5">
                      Reason: {selectedAppointmentForDetails.rescheduleReason}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('mediguide:ask-assistant', {
                      detail: {
                        query: `Explain about appointment ${selectedAppointmentForDetails.id}`,
                      },
                    })
                  );
                  setSelectedAppointmentForDetails(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-purple-950/50 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask doc_agent to Explain
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCourseForm({
                      patientName: selectedAppointmentForDetails.patientName,
                      patientId: selectedAppointmentForDetails.patientId,
                      diagnosis: (selectedAppointmentForDetails as any).symptoms || 'General OPD Consultation',
                      department: selectedAppointmentForDetails.department || 'General Medicine',
                      notes: 'Standard care protocol following appointment.',
                      nextFollowUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                    });
                    setSelectedAppointmentForDetails(null);
                    setShowCourseModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Pill className="w-3.5 h-3.5" />
                  Prescribe Course
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAppointmentForDetails(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
