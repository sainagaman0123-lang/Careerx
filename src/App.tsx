import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UserDashboard } from './components/user/UserDashboard';
import { HospitalDirectory } from './components/user/HospitalDirectory';
import { AISymptomRecommender } from './components/user/AISymptomRecommender';
import { MyAppointments } from './components/user/MyAppointments';
import { MyRoutine } from './components/user/MyRoutine';
import { MyBills } from './components/user/MyBills';
import { UserProfileView } from './components/user/UserProfileView';
import { DoctorPortal } from './components/doctor/DoctorPortal';
import { ReceptionistPortal } from './components/receptionist/ReceptionistPortal';
import { PharmacyPortal } from './components/pharmacy/PharmacyPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { LoginModal } from './components/auth/LoginModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AgentBusMonitorModal } from './components/AgentBusMonitorModal';
import { AgentFloatingAssistant } from './components/AgentFloatingAssistant';
import { storage } from './services/storage';
import { UserRole } from './types/user';
import { useLanguage } from './context/LanguageContext';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [activeRole, setActiveRole] = useState<UserRole>('patient');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAgentMonitorModalOpen, setIsAgentMonitorModalOpen] = useState(false);

  useEffect(() => {
    const session = storage.getAuthSession();
    if (session?.role) {
      setActiveRole(session.role);
    }
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setActiveRole(newRole);
    const session = storage.getAuthSession();
    session.role = newRole;
    storage.setAuthSession(session);
    if (newRole === 'patient') {
      setCurrentTab('dashboard');
    }
  };

  const handleAssistantNavigate = (target: string) => {
    if (['doctor', 'receptionist', 'pharmacy', 'admin', 'patient'].includes(target)) {
      handleRoleChange(target as UserRole);
    } else {
      if (activeRole !== 'patient') {
        handleRoleChange('patient');
      }
      setCurrentTab(target);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Dynamic Multilingual Top Navigation Bar */}
      <Navbar
        activeRole={activeRole}
        currentHospitalName="AIIMS New Delhi"
        onSelectRole={handleRoleChange}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenAgentMonitorModal={() => setIsAgentMonitorModalOpen(true)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        currentTab={currentTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {activeRole === 'patient' && (
          <div>
            {currentTab === 'dashboard' && <UserDashboard onNavigateTab={setCurrentTab} />}
            {currentTab === 'hospitals' && <HospitalDirectory />}
            {currentTab === 'ai_suggest' && (
              <AISymptomRecommender onNavigateTab={(tab) => setCurrentTab(tab)} />
            )}
            {currentTab === 'appointments' && <MyAppointments />}
            {currentTab === 'routine' && <MyRoutine />}
            {currentTab === 'bills' && <MyBills />}
            {currentTab === 'profile' && <UserProfileView />}
          </div>
        )}

        {activeRole === 'doctor' && <DoctorPortal />}
        {activeRole === 'receptionist' && <ReceptionistPortal />}
        {activeRole === 'pharmacy' && <PharmacyPortal />}
        {activeRole === 'admin' && <AdminPortal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">{t('app_title', 'MediGuide AI')}</span>
            <span>—</span>
            <span>{t('app_subtitle', 'Public Hospital Smart Navigation & Multi-Agent Gateway')}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Ayushman Bharat (ABDM) Compatible</span>
            <span>•</span>
            <button
              onClick={() => setIsAgentMonitorModalOpen(true)}
              className="hover:text-cyan-400 transition-colors underline cursor-pointer"
            >
              8 Agent Bus Inspector
            </button>
          </div>
        </div>
      </footer>

      {/* Global Floating Voice & Assistant Copilot */}
      <AgentFloatingAssistant onNavigate={handleAssistantNavigate} activeRole={activeRole} />

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(session) => handleRoleChange(session.role)}
      />


      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      <AgentBusMonitorModal
        isOpen={isAgentMonitorModalOpen}
        onClose={() => setIsAgentMonitorModalOpen(false)}
      />
    </div>
  );
};

export default App;
