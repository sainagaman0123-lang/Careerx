import React, { useState } from 'react';
import {
  X,
  User,
  Building2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  KeyRound,
  Stethoscope,
  Pill,
} from 'lucide-react';
import { ActiveAuthSession, HospitalStaffSession } from '../../types/user';
import { storage } from '../../services/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: ActiveAuthSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'patient' | 'hospital' | 'admin'>('patient');

  const hospitals = storage.getHospitals();
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitals[0]?.id || '');
  const [hospitalRole, setHospitalRole] = useState<'doctor' | 'receptionist' | 'pharmacy'>('doctor');
  const [hospitalCodeInput, setHospitalCodeInput] = useState(hospitals[0]?.uniqueCode || '');
  const [patientPhone, setPatientPhone] = useState('+91 98765 43210');

  if (!isOpen) return null;

  const handleHospitalSelect = (hospId: string) => {
    setSelectedHospitalId(hospId);
    const target = hospitals.find((h) => h.id === hospId);
    if (target) {
      setHospitalCodeInput(target.uniqueCode);
    }
  };

  const handlePatientLogin = () => {
    const profile = storage.getPatientProfile();
    const session: ActiveAuthSession = {
      role: 'patient',
      user: profile,
      token: 'token_pat_' + Date.now(),
      loginTime: new Date().toISOString(),
    };
    storage.setAuthSession(session);
    onLoginSuccess(session);
    onClose();
  };

  const handleHospitalLogin = () => {
    const hosp = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
    const doctorObj = hosp.doctors[0];

    const staffSession: HospitalStaffSession = {
      staffId: 'stf_' + Date.now(),
      name:
        hospitalRole === 'doctor'
          ? doctorObj?.name || 'Dr. Rajesh Sundaram'
          : hospitalRole === 'receptionist'
          ? `${hosp.name.split(' ')[0]} Desk Officer`
          : `${hosp.name.split(' ')[0]} Jan Aushadhi Chemist`,
      role: hospitalRole,
      hospitalId: hosp.id,
      hospitalCode: hospitalCodeInput || hosp.uniqueCode,
      hospitalName: hosp.name,
      department: hospitalRole === 'doctor' ? doctorObj?.specialty : undefined,
      doctorId: hospitalRole === 'doctor' ? doctorObj?.id : undefined,
    };

    const session: ActiveAuthSession = {
      role: hospitalRole,
      hospitalStaff: staffSession,
      token: 'token_staff_' + Date.now(),
      loginTime: new Date().toISOString(),
    };

    storage.setAuthSession(session);
    onLoginSuccess(session);
    onClose();
  };

  const handleAdminLogin = () => {
    const session: ActiveAuthSession = {
      role: 'admin',
      token: 'token_admin_' + Date.now(),
      loginTime: new Date().toISOString(),
    };
    storage.setAuthSession(session);
    onLoginSuccess(session);
    onClose();
  };

  const handleQuickDemo = (credRole: string) => {
    if (credRole === 'patient') {
      handlePatientLogin();
    } else if (credRole === 'admin') {
      handleAdminLogin();
    } else {
      setHospitalRole(credRole as any);
      const hosp = hospitals[0];
      setSelectedHospitalId(hosp.id);
      setHospitalCodeInput(hosp.uniqueCode);

      const doctorObj = hosp.doctors[0];
      const staffSession: HospitalStaffSession = {
        staffId: 'stf_demo_' + credRole,
        name:
          credRole === 'doctor'
            ? doctorObj.name
            : credRole === 'receptionist'
            ? 'AIIMS Reception Desk'
            : 'AIIMS Jan Aushadhi Dispenser',
        role: credRole as any,
        hospitalId: hosp.id,
        hospitalCode: hosp.uniqueCode,
        hospitalName: hosp.name,
        department: credRole === 'doctor' ? doctorObj.specialty : undefined,
        doctorId: credRole === 'doctor' ? doctorObj.id : undefined,
      };

      const session: ActiveAuthSession = {
        role: credRole as any,
        hospitalStaff: staffSession,
        token: 'token_demo_' + credRole,
        loginTime: new Date().toISOString(),
      };

      storage.setAuthSession(session);
      onLoginSuccess(session);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Role Access Gateway
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sign In to <span className="text-cyan-400">MediGuide AI</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your portal: Citizen OPD booking, Hospital Staff (Doctor, Reception, Pharmacy), or National Admin.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('patient')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'patient'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Citizen / Patient
            </button>
            <button
              onClick={() => setActiveTab('hospital')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'hospital'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Hospital Staff
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-rose-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin Hub
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'patient' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Mobile Number / ABHA ID
                </label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Demo account preloaded: Ramesh Kumar Sharma (ABHA: ABHA-9821-4402-9182)
                </span>
              </div>

              <button
                onClick={handlePatientLogin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Enter Citizen Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'hospital' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Public Hospital
                </label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => handleHospitalSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city}, {h.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Staff Role
                  </label>
                  <select
                    value={hospitalRole}
                    onChange={(e) => setHospitalRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="pharmacy">Pharmacy Dispenser</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Hospital Unique Code
                  </label>
                  <input
                    type="text"
                    value={hospitalCodeInput}
                    onChange={(e) => setHospitalCodeInput(e.target.value)}
                    placeholder="e.g. AIIMS-DEL-01"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleHospitalLogin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Access {hospitalRole.toUpperCase()} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Master Administrator Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value="••••••••••••"
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
              </div>

              <button
                onClick={handleAdminLogin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Enter National Admin Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Instant 1-Click Demo Profiles
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickDemo('patient')}
                className="text-left p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all text-xs"
              >
                <div className="font-semibold text-cyan-300 flex items-center gap-1">
                  <User className="w-3 h-3" /> Citizen
                </div>
                <div className="text-[10px] text-slate-400 truncate">Ramesh Kumar (Patient)</div>
              </button>
              <button
                onClick={() => handleQuickDemo('doctor')}
                className="text-left p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-800/50 transition-all text-xs"
              >
                <div className="font-semibold text-violet-300 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Doctor
                </div>
                <div className="text-[10px] text-slate-400 truncate">Dr. Rajesh (AIIMS)</div>
              </button>
              <button
                onClick={() => handleQuickDemo('receptionist')}
                className="text-left p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-xs"
              >
                <div className="font-semibold text-amber-300 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Reception
                </div>
                <div className="text-[10px] text-slate-400 truncate">AIIMS Desk</div>
              </button>
              <button
                onClick={() => handleQuickDemo('pharmacy')}
                className="text-left p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-xs"
              >
                <div className="font-semibold text-emerald-300 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Pharmacy
                </div>
                <div className="text-[10px] text-slate-400 truncate">Jan Aushadhi Counter</div>
              </button>
              <button
                onClick={() => handleQuickDemo('admin')}
                className="text-left p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-800/50 transition-all text-xs col-span-2 sm:col-span-1"
              >
                <div className="font-semibold text-rose-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Admin
                </div>
                <div className="text-[10px] text-slate-400 truncate">National Supervisor</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
