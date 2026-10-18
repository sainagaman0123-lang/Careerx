import React, { useState, useEffect } from 'react';
import { Pill, Calendar, Clock, CheckCircle2, Copy, Check, AlertCircle, User, Building2, Stethoscope, ChevronRight, Download } from 'lucide-react';
import { getMedicalCourses, getAppointments } from '../../services/storage';
import { MedicalCourse } from '../../types/appointment';
import { useLanguage } from '../../context/LanguageContext';
import { downloadPrescriptionPdf } from '../../services/pdfGenerator';

export const MyRoutine: React.FC = () => {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<MedicalCourse[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setCourses(getMedicalCourses());
    const handleProfileUpdate = () => {
      setCourses(getMedicalCourses());
    };
    window.addEventListener('mediguide:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('mediguide:profile-updated', handleProfileUpdate);
  }, []);

  const handleCopyPass = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const activeCourses = courses.filter((c) => c.status === 'Active');
  const completedCourses = courses.filter((c) => c.status !== 'Active');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
              <Pill className="w-3.5 h-3.5 text-indigo-400" />
              <span>doc_agent & user_agent sync</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('routine_title', 'Active Tablet Routines & Medical Courses')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {t('routine_subtitle', 'Prescriptions synchronized directly by doc_agent and user_agent, with daily dosage schedules and secret verification passes.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-right">
              <span className="text-xs text-slate-400 block">{t('routine_active_courses', 'Active Courses')}</span>
              <span className="text-xl font-bold text-indigo-400">{activeCourses.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Courses */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Pill className="w-5 h-5 text-indigo-400" />
          {t('routine_active_courses', 'Current Active Treatment Courses')} ({activeCourses.length})
        </h2>

        {activeCourses.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
            <Pill className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-300">No active medication routine</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              When a hospital doctor prescribes a medical regimen during an OPD consultation, your active schedule and secret passes will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {activeCourses.map((course) => (
              <div
                key={course.id}
                className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xl hover:border-indigo-500/40 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Info Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
                        {course.courseCode}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active Course
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                        {course.department}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {course.diagnosis}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
                        {course.doctorName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        {course.hospitalName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Started: {course.startDate}
                      </span>
                    </div>
                  </div>

                  {/* Secret Pass Code Box */}
                  <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-xl p-4 lg:w-72 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-indigo-300 mb-1.5 font-medium">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                        {t('routine_course_end_pass', 'Course End Pass')}
                      </span>
                      <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-200">PASS CODE</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 rounded-lg p-2 border border-indigo-500/20">
                      <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                        {course.verificationPassCode}
                      </span>
                      <button
                        onClick={() => handleCopyPass(course.verificationPassCode, course.id)}
                        className="px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition-all"
                      >
                        {copiedId === course.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> {t('dash_copied', 'Copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> {t('dash_copy', 'Copy')}
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      {t('routine_give_doctor', 'Give this to doctor before conclusion')}
                    </p>
                    <button
                      type="button"
                      onClick={() => downloadPrescriptionPdf(course)}
                      className="mt-3 w-full py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Prescription (PDF)
                    </button>
                  </div>
                </div>

                {/* Prescribed Medicines */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t('routine_prescribed_formulations', 'Prescribed Formulations & Timings')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {course.medicines.map((med) => (
                      <div
                        key={med.id}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-semibold text-white text-sm">{med.name}</h5>
                              <span className="text-xs text-indigo-400 font-medium">{med.dosage}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/80 text-slate-300">
                              {med.frequency}
                            </span>
                          </div>

                          {/* Dosage Timings */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                                med.timing.morning
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800/40 text-slate-600 line-through'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> {t('dash_morning', 'Morning')}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                                med.timing.afternoon
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-800/40 text-slate-600 line-through'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> {t('dash_noon', 'Noon')}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                                med.timing.night
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-800/40 text-slate-600 line-through'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> {t('dash_night', 'Night')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-slate-400 pt-2 border-t border-slate-700/40 flex items-center justify-between">
                          <span>{med.durationDays} days duration</span>
                          <span className="italic text-slate-500">{med.instructions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Notes & Follow-up */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">{t('routine_clinical_notes', "Doctor's Clinical Notes:")}</span>
                    <span className="italic text-slate-400">{course.notes || 'Take medications on schedule with warm water.'}</span>
                  </div>
                  {course.nextFollowUpDate && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium">
                        {t('routine_next_review', 'Next Recommended Follow-Up:')} {course.nextFollowUpDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Courses History */}
      {completedCourses.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            {t('routine_completed_history', 'Completed Treatment Course History')} ({completedCourses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map((c) => (
              <div key={c.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-400">{c.courseCode}</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                    Verified Concluded
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm">{c.diagnosis}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {c.doctorName} • {c.hospitalName}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Concluded: {c.endDate || 'Completed'}</span>
                  <span>Pass: {c.verificationPassCode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
