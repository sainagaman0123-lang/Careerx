import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Phone, Mail, MapPin, Heart, AlertTriangle, Building2, Save, Check, Calendar, Activity, QrCode } from 'lucide-react';
import { getUserProfile, saveUserProfile, getAppointments } from '../../services/storage';
import { UserProfile } from '../../types/user';
import { Appointment } from '../../types/appointment';
import { useLanguage } from '../../context/LanguageContext';

export const UserProfileView: React.FC = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');

  useEffect(() => {
    setProfile(getUserProfile());
    setAppointments(getAppointments());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile(profile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddAllergy = () => {
    if (allergyInput.trim() && !profile.allergies.includes(allergyInput.trim())) {
      setProfile({
        ...profile,
        allergies: [...profile.allergies, allergyInput.trim()],
      });
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (index: number) => {
    setProfile({
      ...profile,
      allergies: profile.allergies.filter((_, i) => i !== index),
    });
  };

  const handleAddChronic = () => {
    if (chronicInput.trim() && !profile.chronicConditions.includes(chronicInput.trim())) {
      setProfile({
        ...profile,
        chronicConditions: [...profile.chronicConditions, chronicInput.trim()],
      });
      setChronicInput('');
    }
  };

  const handleRemoveChronic = (index: number) => {
    setProfile({
      ...profile,
      chronicConditions: profile.chronicConditions.filter((_, i) => i !== index),
    });
  };

  // Visited hospitals
  const visitedHospitalMap = new Map<string, { name: string; count: number; lastDate: string }>();
  appointments.forEach((apt) => {
    const existing = visitedHospitalMap.get(apt.hospitalName);
    if (existing) {
      existing.count += 1;
      if (new Date(apt.appointmentDate) > new Date(existing.lastDate)) {
        existing.lastDate = apt.appointmentDate;
      }
    } else {
      visitedHospitalMap.set(apt.hospitalName, {
        name: apt.hospitalName,
        count: 1,
        lastDate: apt.appointmentDate,
      });
    }
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-sky-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Ayushman Bharat Digital Mission (ABDM)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('prof_title', 'Patient Profile & Citizen Health Record')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {t('prof_subtitle', 'Comprehensive health identity linked with ABHA card, verified public hospital appointments, and emergency contacts.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Digital ABHA Card & Quick Stats */}
        <div className="space-y-6">
          {/* ABHA Digital Card */}
          <div className="bg-gradient-to-br from-indigo-900/90 via-sky-900/80 to-slate-950 border border-sky-500/30 rounded-2xl p-6 shadow-2xl text-white relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-sky-400/20 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sky-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">ABHA DIGITAL HEALTH</h3>
                  <span className="text-[10px] text-sky-200 uppercase tracking-widest block">National Health Authority</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-sky-300 uppercase tracking-wider block">Citizen Name</span>
                <span className="text-lg font-bold tracking-tight">{profile.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] text-sky-300 uppercase block">ABHA Number</span>
                  <span className="font-mono text-xs font-semibold text-sky-100">{profile.ayushmanBharatId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-300 uppercase block">Blood Group</span>
                  <span className="font-bold text-sm text-red-300">{profile.bloodGroup}</span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-300 uppercase block">Age / Gender</span>
                  <span className="text-xs text-sky-100">{profile.age} yrs / {profile.gender}</span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-300 uppercase block">State</span>
                  <span className="text-xs text-sky-100">{profile.state}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-sky-400/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-8 h-8 text-sky-300/80" />
                <span className="text-[10px] text-sky-300/80 max-w-[130px] leading-tight">
                  Scan at OPD front counter for instant triage
                </span>
              </div>
              <span className="font-mono text-[10px] text-sky-400">Govt of India</span>
            </div>
          </div>

          {/* Visited Hospitals Track Record */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-cyan-400" />
              {t('prof_visited_history', 'Track Record of Hospitals Visited')}
            </h3>

            {visitedHospitalMap.size === 0 ? (
              <p className="text-xs text-slate-500 italic">No past public hospital visits logged yet.</p>
            ) : (
              <div className="space-y-3">
                {Array.from(visitedHospitalMap.values()).map((hosp, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{hosp.name}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-medium">
                        {hosp.count} visits
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Last consultation: {hosp.lastDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Edit Demographics & Medical History */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                {t('prof_demographics', 'Personal Demographics')}
              </h2>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('prof_saved', 'Updated!')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('prof_save', 'Save Details')}
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">{t('prof_fullname', 'Full Name')}</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">{t('prof_phone', 'Phone Number')}</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">{t('prof_email', 'Email Address')}</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">{t('prof_city_state', 'City & State')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="City"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value as any })}
                    placeholder="State"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">{t('dash_blood_group', 'Blood Group')}</label>
                <input
                  type="text"
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">ABHA ID (Ayushman)</label>
                <input
                  type="text"
                  value={profile.ayushmanBharatId}
                  onChange={(e) => setProfile({ ...profile, ayushmanBharatId: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Emergency Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                    {t('prof_emergency_contact', 'Emergency Contact (Name & Relation)')}
                  </label>
                  <input
                    type="text"
                    value={`${profile.emergencyContact.name} (${profile.emergencyContact.relationship})`}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        emergencyContact: { ...profile.emergencyContact, name: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                    {t('prof_emergency_phone', 'Emergency Contact Number')}
                  </label>
                  <input
                    type="text"
                    value={profile.emergencyContact.phone}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        emergencyContact: { ...profile.emergencyContact, phone: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Medical History & Allergies */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              {/* Allergies */}
              <div>
                <label className="text-xs text-slate-400 block mb-2 font-medium">
                  {t('prof_allergies', 'Known Allergies:')}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs flex items-center gap-1.5"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        className="text-red-400 hover:text-red-200 ml-1 cursor-pointer font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    placeholder="Add an allergy (e.g. Penicillin, Sulfa)..."
                    className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="text-xs text-slate-400 block mb-2 font-medium">
                  {t('prof_chronic', 'Chronic Medical Conditions:')}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.chronicConditions.map((condition, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs flex items-center gap-1.5"
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => handleRemoveChronic(idx)}
                        className="text-amber-400 hover:text-amber-200 ml-1 cursor-pointer font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chronicInput}
                    onChange={(e) => setChronicInput(e.target.value)}
                    placeholder="Add condition (e.g. Hypertension, Diabetes Type II)..."
                    className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddChronic}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
