import React, { useState } from 'react';
import {
  User,
  Calendar,
  Pill,
  Sparkles,
  MapPin,
  Clock,
  Key,
  ShieldCheck,
  ChevronRight,
  Bell,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  CalendarClock,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';

interface UserDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigateTab }) => {
  const { t } = useLanguage();
  const profile = storage.getPatientProfile();
  const appointments = storage.getAppointments();
  const courses = storage.getCourses();
  const bills = storage.getBills();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeCourse = courses.find((c) => c.status === 'Active');
  const upcomingAppointment = appointments.find(
    (a) => a.status === 'Accepted' || a.status === 'Pending' || a.status === 'Rescheduled'
  );

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Patient Welcome Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-lg shadow-cyan-500/20">
              {profile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {t('dash_welcome', 'Welcome back')}, {profile.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  {t('dash_abha_verified', 'ABHA Verified')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('dash_abha_id', 'ABHA ID')}: <span className="font-mono text-cyan-300 font-semibold">{profile.ayushmanBharatId}</span> • {t('dash_blood_group', 'Blood Group')}: <span className="text-white font-semibold">{profile.bloodGroup}</span> • {t('dash_age', 'Age')}: {profile.age} {t('dash_yrs', 'yrs')}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {profile.city}, {profile.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {appointments.length} {t('dash_visits_logged', 'Total Visits Logged')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('recommender')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('dash_ai_triage_btn', 'AI Hospital Triage')}</span>
            </button>
            <button
              onClick={() => onNavigateTab('hospitals')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
            >
              <span>{t('dash_browse_btn', 'Browse Hospitals')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Appointment Alert & Secret Pass Code Card */}
        <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" /> {t('dash_next_appointment', 'Next Appointment')}
              </span>
              {upcomingAppointment && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {upcomingAppointment.status}
                </span>
              )}
            </div>

            {upcomingAppointment ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {upcomingAppointment.doctorName}
                  </h3>
                  <p className="text-xs text-cyan-400 font-medium">{upcomingAppointment.department}</p>
                  <p className="text-xs text-slate-400 mt-1">{upcomingAppointment.hospitalName}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date & Slot:</span>
                    <span className="font-semibold text-white">
                      {upcomingAppointment.appointmentDate} at {upcomingAppointment.timeSlot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Location:</span>
                    <a
                      href={upcomingAppointment.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <MapPin className="w-3 h-3" /> {t('hosp_directions', 'View Map')}
                    </a>
                  </div>
                </div>

                {/* Secret Pass Code */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> {t('dash_secret_pass_code', 'Your Secret Pass Code')}
                    </span>
                    <button
                      onClick={() => handleCopy(upcomingAppointment.passCode)}
                      className="text-[11px] text-cyan-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedCode === upcomingAppointment.passCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> {t('dash_copied', 'Copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> {t('dash_copy', 'Copy')}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-extrabold text-white tracking-widest text-center py-1 bg-slate-950/60 rounded-xl border border-cyan-500/20">
                    {upcomingAppointment.passCode}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed text-center">
                    {t('dash_pass_desc', 'Share this code with your doctor at the end of consultation so they can verify that the course/visit completed.')}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400">
                  <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{t('dash_reminders_active', 'Automated reminders sent at 2 hrs and 1 min prior to visit via Email/SMS.')}</span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => onNavigateTab('appointments')}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('apt_reschedule_slot', 'Reschedule Slot')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">No pending appointments.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('appointments')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>{t('dash_view_all_appointments', 'View All Appointments')} ({appointments.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Tablet Routine & Course Card */}
        <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-400" /> {t('dash_active_routine', 'Active Tablet Routine')}
              </span>
              {activeCourse && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold font-mono">
                  {activeCourse.courseCode}
                </span>
              )}
            </div>

            {activeCourse ? (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white">{activeCourse.diagnosis}</h4>
                  <p className="text-xs text-slate-400">
                    {activeCourse.doctorName} • {activeCourse.hospitalName}
                  </p>
                </div>

                <div className="space-y-2">
                  {activeCourse.medicines.map((med) => (
                    <div
                      key={med.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{med.name}</span>
                        <span className="text-[11px] text-cyan-300 font-mono">{med.dosage}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            med.timing.morning
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-900 text-slate-600'
                          }`}
                        >
                          {t('dash_morning', 'Morning')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            med.timing.afternoon
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : 'bg-slate-900 text-slate-600'
                          }`}
                        >
                          {t('dash_noon', 'Noon')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            med.timing.night
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-900 text-slate-600'
                          }`}
                        >
                          {t('dash_night', 'Night')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">"{med.instructions}"</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-400">{t('dash_next_follow_up', 'Next Follow-up')}:</span>
                  <span className="font-semibold text-cyan-300">
                    {activeCourse.nextFollowUpDate || 'As advised'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">No active medication course currently prescribed.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('routine')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>{t('dash_view_routine_details', 'View Full Routine Details')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Features & Track Record */}
        <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> {t('dash_track_record', 'Patient Track Record')}
            </span>

            <div className="space-y-3">
              <div
                onClick={() => onNavigateTab('profile')}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{t('dash_check_profile', 'Check Your Profile')}</h5>
                    <p className="text-[11px] text-slate-400">{t('dash_check_profile_sub', 'Medical history, allergies, ABHA record')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>

              <div
                onClick={() => onNavigateTab('hospitals')}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{t('dash_find_hosp', 'Find Public Hospitals')}</h5>
                    <p className="text-[11px] text-slate-400">{t('dash_find_hosp_sub', 'Filter by Indian states, distance, OPD cost')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>

              <div
                onClick={() => onNavigateTab('recommender')}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{t('dash_ai_suggest_title', 'Use AI to Suggest')}</h5>
                    <p className="text-[11px] text-slate-400">{t('dash_ai_suggest_sub', 'Triage health complaints & match hospital')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
              </div>

              <div
                onClick={() => onNavigateTab('bills')}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{t('dash_pharm_invoices', 'Pharmacy Invoices')}</h5>
                    <p className="text-[11px] text-slate-400">{bills.length} {t('dash_pharm_invoices_sub', 'official PDF receipts recorded')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
            <span>MediNav User Agent is standing by at bottom right. Voice commands active!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
