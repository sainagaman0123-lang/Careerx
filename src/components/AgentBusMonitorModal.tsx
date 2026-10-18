import React, { useState, useEffect } from 'react';
import { X, Bot, ArrowRight, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { agentBus } from '../services/agentBus';
import { storage } from '../services/storage';
import { AgentLogEvent, AgentMetadata } from '../types/agent';

interface AgentBusMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentBusMonitorModal: React.FC<AgentBusMonitorModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AgentLogEvent[]>([]);
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen) return;

    setLogs(agentBus.getLogs());
    setAgents(storage.getAgents());

    const unsubscribe = agentBus.subscribe(() => {
      setLogs(agentBus.getLogs());
      setAgents(storage.getAgents());
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs =
    selectedAgentFilter === 'all'
      ? logs
      : logs.filter((l) => l.sender === selectedAgentFilter || l.recipient === selectedAgentFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Live Multi-Agent Communication Bus</h3>
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Stream
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit and telemetry log of all 8 collaborative agents (Negotiation, Inventory, Billing, Clinical, Supervisory)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                agentBus.clearLogs();
                setLogs([]);
              }}
              title="Clear event logs"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Agent:</span>
          <button
            onClick={() => setSelectedAgentFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedAgentFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Agents ({logs.length})
          </button>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentFilter(agent.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                selectedAgentFilter === agent.id
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {agent.id}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No inter-agent messages recorded for this filter yet.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  log.isWarning
                    ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 font-sans">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono text-[11px] border border-cyan-800/40 font-semibold">
                      {log.sender}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-400 font-mono text-[11px] border border-indigo-800/40 font-semibold">
                      {log.recipient}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      {log.messageType}
                    </span>
                    {log.isWarning && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" /> Warning
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{log.latencyMs}ms</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed pl-1">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Agent Bus Integrity: Secure, In-Memory Event Dispatcher Active</span>
          </div>
          <span className="text-slate-500 font-mono">Total Packets: {logs.length}</span>
        </div>
      </div>
    </div>
  );
};
