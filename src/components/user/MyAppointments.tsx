import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Key,
  Copy,
  Check,
  Tag,
  Bell,
  CalendarClock,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { Appointment } from '../../types/appointment';
import { useLanguage } from '../../context/LanguageContext';

export const MyAppointments: React.FC = () => {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>(storage.getAppointments());
  const [copiedPass, setCopiedPass] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleModalApt, setRescheduleModalApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setAppointments(storage.getAppointments());
    };
    window.addEventListener('mediguide:appointment-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mediguide:appointment-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPass(code);
    setTimeout(() => setCopiedPass(null), 2000);
  };

  const handleCancel = (aptId: string) => {
    if (confirm('Cancel this appointment?')) {
      agentBus.cancelAppointmentViaAgents({ appointmentId: aptId, reason: 'Cancelled by citizen' });
      setAppointments(storage.getAppointments());
    }
  };

  const handleOpenReschedule = (apt: Appointment) => {
    setRescheduleModalApt(apt);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setRescheduleDate(tomorrow);
    setRescheduleSlot(apt.timeSlot === '10:00 AM' ? '11:30 AM' : '10:00 AM');
    setRescheduleReason(
      apt.status === 'Completed'
        ? 'Follow-up consultation after visit'
        : 'Schedule conflict / preferred new time'
    );
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleModalApt) return;
    const res = agentBus.rescheduleAppointmentViaAgents({
      appointmentId: rescheduleModalApt.id,
      newDate: rescheduleDate,
      newSlot: rescheduleSlot,
      reason: rescheduleReason,
    });

    setAppointments(storage.getAppointments());
    setSuccessBanner(
      `Appointment with ${rescheduleModalApt.doctorName} successfully rescheduled to ${rescheduleDate} at ${rescheduleSlot}! New Secret Pass Code: ${res.appointment.passCode}`
    );
    setRescheduleModalApt(null);
    setTimeout(() => setSuccessBanner(null), 7000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium">
              Appointments & Passes
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            {t('apt_title', 'My Hospital Consultations & Secret Pass Codes')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('apt_subtitle', 'Track confirmed OPD slots, active courses, secret authentication passes, and emergency reschedule vouchers.')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
          <span>Total Records: <strong className="text-white">{appointments.length}</strong></span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="font-medium leading-relaxed">{successBanner}</p>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400 text-xs">
            No consultations recorded.
          </div>
        ) : (
          appointments.map((apt) => {
            const isCompleted = apt.status === 'Completed';
            const isAccepted = apt.status === 'Accepted';
            const isEmergencyPostponed = apt.status === 'Emergency Postponed';
            const isRescheduled = apt.status === 'Rescheduled';

            return (
              <div
                key={apt.id}
                className={`p-6 rounded-3xl border shadow-xl transition-all ${
                  isEmergencyPostponed
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : isCompleted
                    ? 'bg-slate-900/60 border-slate-800'
                    : isRescheduled
                    ? 'bg-amber-950/10 border-amber-500/40 hover:border-amber-500/60'
                    : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-semibold">
                        {apt.hospitalCode}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isCompleted
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : isEmergencyPostponed
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isRescheduled
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : apt.status === 'Cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                      {isRescheduled && apt.previousAppointmentDate && (
                        <span className="text-[11px] text-amber-300/80 font-mono">
                          (Moved from {apt.previousAppointmentDate})
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{apt.doctorName}</h3>
                      <p className="text-xs text-cyan-400 font-medium">{apt.department} Department</p>
                      <p className="text-xs text-slate-300 mt-1">{apt.hospitalName}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {apt.appointmentDate}
                      </span>
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {apt.timeSlot}
                      </span>
                      <a
                        href={apt.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-cyan-400 hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Directions
                      </a>
                    </div>

                    {isEmergencyPostponed && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Tag className="w-4 h-4" /> {t('apt_emergency_compensation', 'Doctor Emergency Override Compensation Applied')}
                        </div>
                        <p className="text-[11px] text-amber-300/90 leading-relaxed">
                          {apt.rejectionReason}
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">{t('apt_pharmacy_voucher', 'Pharmacy & Fee Voucher:')}</span>
                          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 bg-slate-950 rounded border border-amber-400/40">
                            {apt.discountVoucherCode} (25% OFF)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 w-full sm:w-64 text-center">
                      <div className="flex items-center justify-between text-[11px] text-cyan-300 mb-1">
                        <span className="flex items-center gap-1 font-semibold">
                          <Key className="w-3 h-3" /> {t('apt_consultation_pass', 'Consultation Pass')}
                        </span>
                        <button
                          onClick={() => handleCopy(apt.passCode)}
                          className="hover:text-white flex items-center gap-1 text-[10px]"
                        >
                          {copiedPass === apt.passCode ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-lg font-extrabold text-white tracking-widest py-1 bg-slate-900 rounded-xl border border-slate-800">
                        {apt.passCode}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {isCompleted
                          ? t('apt_pass_verified', '✔ Verified & Concluded with Doctor')
                          : t('apt_pass_instruction', 'Provide to doctor during consultation')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full justify-end flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800">
                        <Bell className="w-3 h-3 text-amber-400" />
                        <span>2h & 1m Alert</span>
                      </div>

                      {/* Reschedule Slot Button - explicitly available for any appointment, including after appointment / Completed */}
                      <button
                        onClick={() => handleOpenReschedule(apt)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm hover:border-cyan-400 cursor-pointer"
                        title="Reschedule appointment date or time slot"
                      >
                        <CalendarClock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {isCompleted
                            ? t('apt_reschedule_followup', 'Reschedule Follow-Up Slot')
                            : t('apt_reschedule_slot', 'Reschedule Slot')}
                        </span>
                      </button>

                      {!isCompleted && !isEmergencyPostponed && apt.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCancel(apt.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs transition-colors cursor-pointer"
                        >
                          {t('apt_cancel_slot', 'Cancel Slot')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Reschedule Modal */}
      {rescheduleModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('apt_reschedule_title', 'Reschedule Consultation Slot')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {rescheduleModalApt.doctorName} • {rescheduleModalApt.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModalApt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Consultation Context */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Hospital:</span>
                <span className="font-semibold text-white">{rescheduleModalApt.hospitalName}</span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Current Slot:</span>
                <span className="font-mono text-cyan-300">
                  {rescheduleModalApt.appointmentDate} at {rescheduleModalApt.timeSlot}
                </span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Status:</span>
                <span className="text-amber-300 font-semibold">{rescheduleModalApt.status}</span>
              </div>
            </div>

            {/* Select Date */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                {t('apt_select_new_date', 'Select New Date')}
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Select Time Slot */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {t('apt_select_new_slot', 'Select New Time Slot')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  '09:00 AM',
                  '09:30 AM',
                  '10:00 AM',
                  '10:30 AM',
                  '11:00 AM',
                  '11:30 AM',
                  '02:00 PM',
                  '02:30 PM',
                  '03:00 PM',
                ].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setRescheduleSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      rescheduleSlot === slot
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason / Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Reason / Note for Rescheduling
              </label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Follow-up after consultation, schedule conflict, routine review..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Agent Handshake Banner */}
            <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-300/90 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Autonomous Multi-Agent Handshake:</strong> Your <code>user_agent</code> coordinates directly with the hospital <code>user_receptionist_agent</code> to re-verify doctor availability and issue a new secret consultation pass code.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModalApt(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('apt_reschedule_btn', 'Confirm Reschedule')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
