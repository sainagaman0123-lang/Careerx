import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Bot,
  Activity,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Terminal,
  TrendingUp,
  Star,
  RefreshCw,
  Cpu,
  BarChart3,
  Layers,
  Key,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getAgents,
  updateAgent,
  getHospitals,
  addHospital,
  getAgentAuditLogs,
  getHospitalReviews,
  getAppointments,
  getPharmacyBills,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { AgentMetadata, AgentAuditLog } from '../../types/agent';
import { Hospital, HospitalReview } from '../../types/hospital';
import { useLanguage } from '../../context/LanguageContext';

export const AdminPortal: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'supervision' | 'analytics' | 'hospitals' | 'reviews' | 'audit' | 'gemini_api'>('supervision');
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [reviews, setReviews] = useState<HospitalReview[]>([]);
  const [auditLogs, setAuditLogs] = useState<AgentAuditLog[]>([]);
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());
  const [showKeyText, setShowKeyText] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  // New Hospital Form
  const [hospForm, setHospForm] = useState({
    name: '',
    uniqueCode: '',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: '',
    googleMapsUrl: '',
    phone: '+91 ',
    estimatedConsultationCost: 10,
    totalBeds: 1200,
    bedsAvailable: 80,
    departments: ['General Medicine', 'Cardiology', 'Pediatrics'],
  });

  const loadData = () => {
    setAgents(getAgents());
    setHospitals(getHospitals());
    setReviews(getHospitalReviews());
    setAuditLogs(getAgentAuditLogs().reverse());
    setGeminiKey(getGeminiApiKey());
  };

  useEffect(() => {
    loadData();
    const unsub = agentBus.onMessage(() => {
      loadData();
    });
    const handleTab = (e: any) => {
      if (e.detail?.tab && ['supervision', 'analytics', 'hospitals', 'reviews', 'audit', 'gemini_api'].includes(e.detail.tab)) {
        setActiveTab(e.detail.tab);
      }
    };
    const handleKeyUpdated = (e: any) => {
      setGeminiKey(e.detail || getGeminiApiKey());
    };
    window.addEventListener('mediguide:admin-tab', handleTab);
    window.addEventListener('mediguide:api-key-updated', handleKeyUpdated);
    return () => {
      unsub();
      window.removeEventListener('mediguide:admin-tab', handleTab);
      window.removeEventListener('mediguide:api-key-updated', handleKeyUpdated);
    };
  }, []);

  const handleSaveApiKey = () => {
    setGeminiApiKey(geminiKey);
    setIsKeySaved(true);
    confetti({ particleCount: 65, spread: 60 });
    setTimeout(() => {
      setIsKeySaved(false);
    }, 1500);
  };

  const handleClearApiKey = () => {
    setGeminiApiKey('');
    setGeminiKey('');
  };

  // Toggle Agent Active / Inactive
  const toggleAgentStatus = (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Idle' : 'Active';
    updateAgent(agentId, { status: newStatus as any });
    setAgents(getAgents());

    agentBus.dispatch(
      'admin_agent',
      agentId as any,
      'AGENT_STATUS_TOGGLED',
      { agentId, newStatus },
      `admin_agent manually set status of ${agentId} to ${newStatus}.`
    );
  };

  // Submit New Hospital
  const handleAddHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospForm.name || !hospForm.uniqueCode) {
      alert('Hospital Name and Unique Code are required.');
      return;
    }

    const newHosp: Hospital = {
      id: 'hosp_' + Date.now(),
      uniqueCode: hospForm.uniqueCode,
      name: hospForm.name,
      state: hospForm.state as any,
      city: hospForm.city,
      address: hospForm.address || `${hospForm.city}, ${hospForm.state}`,
      googleMapsUrl: hospForm.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(hospForm.name)}`,
      phone: hospForm.phone,
      rating: 4.8,
      reviewsCount: 1,
      estimatedConsultationCost: Number(hospForm.estimatedConsultationCost),
      distanceKm: 5.0,
      popularityScore: 85,
      bedsAvailable: Number(hospForm.bedsAvailable),
      totalBeds: Number(hospForm.totalBeds),
      isGovernment: true,
      image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
      departments: hospForm.departments as any,
      doctors: [],
    };

    addHospital(newHosp);
    setShowAddHospitalModal(false);
    loadData();
    confetti({ particleCount: 75, spread: 60 });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-purple-950/60 to-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>admin_agent Central Authority</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {t('admin_portal_title', 'National Administrative Supervision Hub')}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Ministry of Health & Family Welfare • National Autonomous Multi-Agent Telemetry & Orchestration Engine
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('gemini_api')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                geminiKey
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{geminiKey ? 'Gemini API: Configured' : 'Configure Gemini API'}</span>
            </button>

            <button
              onClick={() => setShowAddHospitalModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('admin_register_hosp_btn', 'Register New Hospital')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('supervision')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'supervision'
              ? 'bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Cpu className="w-4 h-4" />
          {t('admin_supervision_tab', 'Multi-Agent Supervision Hub (8 Agents)')}
        </button>

        <button
          onClick={() => setActiveTab('gemini_api')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'gemini_api'
              ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Key className="w-4 h-4" />
          Google Gemini API Key Config
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t('admin_cross_analytics_tab', 'Cross-Hospital Analytics & Revenue')}
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'hospitals'
              ? 'bg-teal-600/20 border border-teal-500/40 text-teal-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          {t('admin_registered_tab', 'Registered Hospitals')} ({hospitals.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Star className="w-4 h-4" />
          {t('admin_reviews_tab', 'Citizen Reviews & Moderation')}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          {t('admin_audit_stream', 'Real-Time Inter-Agent Audit Stream')}
        </button>
      </div>

      {/* Tab 1: 8 Micro-Agents Supervision */}
      {activeTab === 'supervision' && (
        <div className="space-y-6">
          {/* Gemini API Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Google Gemini API Key Management</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${geminiKey ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {geminiKey ? 'ACTIVE • GEMINI 1.5 FLASH' : 'STANDBY • LOCAL MOCK ENGINE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {geminiKey ? `Active Key: ...${geminiKey.slice(-6)} powering all 8 micro-agents.` : 'No external API key set. Running on high-performance local clinical neural heuristics.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('gemini_api')}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              Configure Gemini API Key
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              {t('admin_active_agents', '8 Active Autonomous Micro-Agents')}
            </h3>
            <span className="text-xs text-slate-400">Real-time load balancing and circuit breaking enabled</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-purple-500/40 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {agent.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        agent.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                      />
                      {agent.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Packets Processed:</span>
                    <span className="font-semibold text-white">{agent.messagesHandled}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Average Latency:</span>
                    <span className="font-mono text-emerald-400">{agent.latencyMs || 24}ms</span>
                  </div>

                  <button
                    onClick={() => toggleAgentStatus(agent.id, agent.status)}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      agent.status === 'Active'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {agent.status === 'Active' ? t('admin_deactivate', 'Deactivate') : t('admin_activate', 'Activate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Cross-Hospital Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hospitals.map((hosp) => (
              <div key={hosp.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-blue-400">{hosp.uniqueCode}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    ★ {hosp.rating}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">{hosp.name}</h4>
                <p className="text-xs text-slate-400">{hosp.city}, {hosp.state}</p>

                <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Beds Occupancy:</span>
                    <span>{hosp.totalBeds - hosp.bedsAvailable} / {hosp.totalBeds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">OPD Reg Fee:</span>
                    <span className="text-emerald-400">₹{hosp.estimatedConsultationCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doctors Count:</span>
                    <span>{hosp.doctors.length} specialists</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Registered Hospitals */}
      {activeTab === 'hospitals' && (
        <div className="space-y-4">
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {hosp.uniqueCode}
                  </span>
                  <h4 className="font-bold text-white text-base">{hosp.name}</h4>
                </div>
                <p className="text-xs text-slate-400">{hosp.address} • Phone: {hosp.phone}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hosp.departments.map((dept, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Beds</span>
                <span className="text-lg font-bold text-white">{hosp.totalBeds}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{rev.userName}</span>
                  <span className="text-xs text-slate-500">• {rev.date}</span>
                </div>
                <span className="text-amber-400 font-semibold text-xs flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {rev.rating} / 5
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">"{rev.comment}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Real-time Audit Stream */}
      {activeTab === 'audit' && (
        <div className="bg-black/80 border border-slate-800 rounded-2xl p-5 shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-slate-300">
                {t('admin_audit_stream', 'Real-Time Inter-Agent Audit Stream')}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Live stream (all 8 agents)</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 rounded bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
                <span className="text-purple-400 font-semibold shrink-0">
                  [{log.senderAgent} ➔ {log.recipientAgent}]
                </span>
                <span className="text-slate-300 flex-1">{log.payloadSummary}</span>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Google Gemini API Key Management (Admin Exclusive) */}
      {activeTab === 'gemini_api' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Google Gemini API Key Configuration
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ADMIN ONLY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure central Gemini LLM API key used across all 8 autonomous micro-agents
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                geminiKey ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${geminiKey ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {geminiKey ? 'Configured & Active' : 'Not Configured (Mock Fallback)'}
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                MediGuide AI operates with a built-in multi-agent orchestration architecture. When a Google Gemini API key is configured by an Administrator here, agents query <span className="font-mono text-cyan-400 font-semibold">gemini-1.5-flash</span> directly while enforcing strict clinical boundaries, Indian ABDM protocols, and navigation commands.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-4 pr-24 py-3 text-xs text-white placeholder-slate-600 font-mono outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs transition-colors flex items-center gap-1"
                  >
                    {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showKeyText ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Key is securely stored in local browser storage and only displayed on this Admin portal
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline font-medium shrink-0"
                >
                  <span>Get Gemini API Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  {geminiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-all cursor-pointer"
                    >
                      Clear API Key
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('supervision')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                  >
                    Back to Supervision
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-900/40 cursor-pointer transition-all"
                  >
                    {isKeySaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved Successfully!
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Save Gemini API Key
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New Hospital */}
      {showAddHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Register New Public Hospital</h3>
                  <span className="text-xs text-slate-400">National Registry of India</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddHospitalModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddHospital} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={hospForm.name}
                    onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                    placeholder="e.g. Victoria Hospital"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Unique Code</label>
                  <input
                    type="text"
                    required
                    value={hospForm.uniqueCode}
                    onChange={(e) => setHospForm({ ...hospForm, uniqueCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. VIC-BLR-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">State</label>
                  <input
                    type="text"
                    value={hospForm.state}
                    onChange={(e) => setHospForm({ ...hospForm, state: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">City</label>
                  <input
                    type="text"
                    value={hospForm.city}
                    onChange={(e) => setHospForm({ ...hospForm, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">Total Beds</label>
                  <input
                    type="number"
                    value={hospForm.totalBeds}
                    onChange={(e) => setHospForm({ ...hospForm, totalBeds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">OPD Registration Fee (INR)</label>
                  <input
                    type="number"
                    value={hospForm.estimatedConsultationCost}
                    onChange={(e) => setHospForm({ ...hospForm, estimatedConsultationCost: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddHospitalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 cursor-pointer transition-all"
                >
                  Register Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
