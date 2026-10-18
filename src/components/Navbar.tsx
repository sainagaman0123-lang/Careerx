import React from 'react';
import {
  Activity,
  User,
  Stethoscope,
  Building2,
  Pill,
  ShieldAlert,
  Globe,
  Key,
  RotateCcw,
  Sparkles,
  Bot,
} from 'lucide-react';
import { UserRole } from '../types/user';
import { storage } from '../services/storage';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  activeRole: UserRole;
  currentHospitalName?: string;
  onSelectRole: (role: UserRole) => void;
  onOpenLoginModal: () => void;
  onOpenApiKeyModal: () => void;
  onOpenAgentMonitorModal: () => void;
  onNavigateTab: (tab: string) => void;
  currentTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRole,
  currentHospitalName,
  onOpenLoginModal,
  onOpenApiKeyModal,
  onOpenAgentMonitorModal,
  onNavigateTab,
  currentTab,
}) => {
  const { currentLanguage, setLanguage, t, languages, langInfo } = useLanguage();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'patient':
        return { label: t('role_patient', 'Citizen / Patient'), icon: User, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'doctor':
        return { label: t('role_doctor', 'Doctor Desk'), icon: Stethoscope, color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' };
      case 'receptionist':
        return { label: t('role_receptionist', 'Receptionist Desk'), icon: Building2, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'pharmacy':
        return { label: t('role_pharmacy', 'Jan Aushadhi Pharmacy'), icon: Pill, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'admin':
        return { label: t('role_admin', 'National Admin Hub'), icon: ShieldAlert, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  const currentBadge = getRoleBadge(activeRole);
  const BadgeIcon = currentBadge.icon;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/85 shadow-lg backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigateTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  {t('app_title', 'MediGuide AI')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-medium">
                  {t('agentic_badge', 'Agentic v2.4')}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t('app_subtitle', 'Public Hospital Smart Navigation & Multi-Agent Gateway')}
              </p>
            </div>
          </div>

          {/* User Side Navigation Tabs (if patient role) */}
          {activeRole === 'patient' && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onNavigateTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_dashboard', 'Dashboard')}
              </button>
              <button
                onClick={() => onNavigateTab('hospitals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'hospitals'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_hospitals', 'Find Hospitals')}
              </button>
              <button
                onClick={() => onNavigateTab('recommender')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  currentTab === 'recommender'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-cyan-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t('nav_ai_suggest', 'AI Suggest')}
              </button>
              <button
                onClick={() => onNavigateTab('appointments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'appointments'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_appointments', 'My Appointments')}
              </button>
              <button
                onClick={() => onNavigateTab('routine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'routine'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_routine', 'Tablet Routine')}
              </button>
              <button
                onClick={() => onNavigateTab('bills')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'bills'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_bills', 'Pharmacy Bills')}
              </button>
              <button
                onClick={() => onNavigateTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'profile'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t('nav_profile', 'Profile & ABHA')}
              </button>
            </nav>
          )}

          {/* Right Header Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Agent Bus Activity Trigger */}
            <button
              onClick={onOpenAgentMonitorModal}
              title="Inspect Live Agent-to-Agent Bus"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Bot className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
              <span className="font-mono text-[11px] hidden md:inline">{t('agents_live', '8 Agents Live')}</span>
            </button>

            {/* Language Switcher Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs hover:border-cyan-400 shadow-sm transition-all">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold">{langInfo.nativeName}</span>
              </button>
              <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-1 hidden group-hover:block z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-500 uppercase font-semibold">
                  Select Language / भाषा चुनें
                </div>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      currentLanguage === lang.code
                        ? 'text-cyan-400 font-bold bg-cyan-500/10'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-500">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Switcher / Login Badge */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLoginModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${currentBadge.color}`}
              >
                <BadgeIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{currentBadge.label}</span>
                {currentHospitalName && activeRole !== 'patient' && activeRole !== 'admin' && (
                  <span className="hidden lg:inline text-[10px] opacity-80 border-l border-current pl-1.5">
                    {currentHospitalName.split(' ')[0]}
                  </span>
                )}
              </button>

              {/* Gemini API Key Setting - ONLY displayed on admin page */}
              {activeRole === 'admin' && (
                <button
                  onClick={onOpenApiKeyModal}
                  title="Google Gemini API Key Config (Admin Only)"
                  className="p-1.5 rounded-lg bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline text-[11px] font-semibold text-amber-300">Gemini API</span>
                </button>
              )}

              {/* Reset Data */}
              <button
                onClick={() => {
                  if (confirm('Reset all demo data back to default initial state?')) {
                    storage.resetAll();
                  }
                }}
                title={t('reset_data', 'Reset Demo Data')}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-colors hidden sm:flex"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
