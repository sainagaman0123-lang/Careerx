import React, { useState, useEffect } from 'react';
import { Bot, Zap, CheckCircle2, AlertTriangle, ShieldCheck, Terminal, RefreshCw, Cpu } from 'lucide-react';
import { getAgentAuditLogs } from '../../services/storage';
import { AgentAuditLog } from '../../types/agent';
import { useLanguage } from '../../context/LanguageContext';

export const DoctorScheduleAgent: React.FC = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AgentAuditLog[]>([]);
  const [autoResolveClashes, setAutoResolveClashes] = useState(true);
  const [emergencyStandby, setEmergencyStandby] = useState(false);

  useEffect(() => {
    const fetchLogs = () => {
      const all = getAgentAuditLogs();
      const filtered = all.filter(
        (l) => l.senderAgent === 'doc_schd_agent' || l.recipientAgent === 'doc_schd_agent' || l.senderAgent === 'doc_agent'
      );
      setLogs(filtered.slice(-15).reverse());
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Control Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              doc_schd_agent
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                Autonomous Active
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Conflict-free scheduling, emergency override compensation, and slot load balancing engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={autoResolveClashes}
              onChange={(e) => setAutoResolveClashes(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
            />
            Auto-Resolve Clashes
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={emergencyStandby}
              onChange={(e) => setEmergencyStandby(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
            />
            Emergency Standby Mode
          </label>
        </div>
      </div>

      {/* Autonomous Schedule Health Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Buffer Interval Engine
          </div>
          <p className="text-xs text-slate-400">
            Maintains 15-minute diagnostic cushion between complex consultations to prevent queue buildup.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-1">
            <Zap className="w-4 h-4" />
            Double-Booking Prevention
          </div>
          <p className="text-xs text-slate-400">
            Evaluates cross-agent slot state with zero latency lock before confirming patient booking.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-red-400 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            25% Emergency Compensation
          </div>
          <p className="text-xs text-slate-400">
            Automatically issues discount vouchers and high-priority rescheduled slots when triage calls.
          </p>
        </div>
      </div>

      {/* Real-time Agent Terminal */}
      <div className="bg-black/80 border border-slate-800 rounded-2xl p-5 shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">doc_schd_agent Live Telemetry Terminal</span>
          </div>
          <span className="text-[10px] text-slate-500">Live stream (polling agent bus)</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-4 text-center">
              Awaiting scheduler bus events...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-slate-900/90 border border-slate-800/80 flex items-start gap-2.5">
                <span className="text-indigo-400 font-semibold shrink-0">[{log.senderAgent} ➔ {log.recipientAgent}]</span>
                <span className="text-slate-300 flex-1">{log.payloadSummary}</span>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
