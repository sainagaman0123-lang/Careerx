import React, { useState } from 'react';
import { X, Key, Check, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { storage } from '../services/storage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(storage.getGeminiApiKey());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    storage.setGeminiApiKey(apiKey);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    storage.setGeminiApiKey('');
    setApiKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Google Gemini API Key</h3>
            <p className="text-xs text-slate-400">Optional live LLM power for all 8 agents</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          MediGuide AI operates with a built-in agentic reasoning engine. If you provide your Gemini API key, agents will query <span className="font-mono text-cyan-400 font-medium">gemini-1.5-flash</span> directly while enforcing strict clinical boundaries and navigation commands.
        </p>

        <div className="space-y-3 mb-5">
          <label className="text-xs font-semibold text-slate-300 block">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-none transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Key stored locally in your browser
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:underline"
            >
              Get Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {apiKey && (
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              Clear Key
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" /> Saved!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Save Key
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
