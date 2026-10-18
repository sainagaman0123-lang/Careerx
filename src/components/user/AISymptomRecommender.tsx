import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Stethoscope,
  Building2,
  MapPin,
  Star,
  ArrowRight,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { askGeminiOrSimulate } from '../../services/gemini';
import { voiceService } from '../../services/speech';
import { agentBus } from '../../services/agentBus';
import { Hospital, MedicalDepartment } from '../../types/hospital';
import { useLanguage } from '../../context/LanguageContext';

interface AISymptomRecommenderProps {
  onNavigateTab: (tab: string) => void;
}

export const AISymptomRecommender: React.FC<AISymptomRecommenderProps> = ({ onNavigateTab }) => {
  const { currentLanguage, t } = useLanguage();
  const patient = storage.getPatientProfile();
  const hospitals = storage.getHospitals();

  const [symptomInput, setSymptomInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    specialty: MedicalDepartment;
    urgency: 'Low' | 'Moderate' | 'Urgent';
    rationale: string;
    matchedHospitals: Hospital[];
  } | null>(null);

  const sampleComplaints = [
    'Severe persistent knee pain and swelling after morning walks, need low cost hospital',
    'Chest heaviness radiating towards left arm, high BP patient, Hyderabad/Delhi preferred',
    'Frequent dizziness, migraine headaches and blurred vision in the evening',
  ];

  const handleAnalyze = async (complaintText?: string) => {
    const text = (complaintText || symptomInput).trim();
    if (!text || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const res = await askGeminiOrSimulate(text, {
        agentId: 'user_agent',
        activeRole: 'patient',
        userName: patient.name,
        language: currentLanguage,
      });

      const lower = text.toLowerCase();
      let specialty: MedicalDepartment = 'General Medicine';
      let urgency: 'Low' | 'Moderate' | 'Urgent' = 'Moderate';

      if (lower.includes('chest') || lower.includes('heart') || lower.includes('breath') || lower.includes('सीने') || lower.includes('ఛాతీ')) {
        specialty = 'Cardiology';
        urgency = 'Urgent';
      } else if (lower.includes('knee') || lower.includes('bone') || lower.includes('joint') || lower.includes('घुटने') || lower.includes('మోకాలు')) {
        specialty = 'Orthopedics';
        urgency = 'Moderate';
      } else if (lower.includes('headache') || lower.includes('migraine') || lower.includes('सिरदर्द')) {
        specialty = 'Neurology';
        urgency = 'Moderate';
      }

      let matched = hospitals.filter((h) => h.departments.includes(specialty));
      if (matched.length === 0) {
        matched = hospitals.slice(0, 2);
      }

      setAnalysisResult({
        specialty,
        urgency,
        rationale: res.reply,
        matchedHospitals: matched,
      });

      agentBus.dispatch(
        'user_agent',
        'user_ui',
        'GENERAL_CHAT',
        { text, specialty, matchedCount: matched.length },
        `AI Triage identified ${specialty} (${urgency} priority) for patient complaint.`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      voiceService.startListening(
        currentLanguage,
        (text) => {
          setIsListening(false);
          setSymptomInput(text);
          handleAnalyze(text);
        },
        () => setIsListening(false)
      );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> {t('ai_triage_badge', 'Agentic AI Triage & Hospital Matcher')}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {t('ai_triage_title', 'Describe Your Health Concern')}
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          {t('ai_triage_subtitle', "MediGuide's clinical reasoning agent analyzes your symptoms, recommends the exact medical department, and suggests the highest-ranked public hospitals aligned with your location and budget.")}
        </p>

        <div className="mt-6 bg-slate-950/90 rounded-2xl border border-slate-800 p-3.5 focus-within:border-cyan-500 transition-all shadow-inner">
          <textarea
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            rows={3}
            placeholder={t('ai_triage_placeholder', 'E.g., I have been feeling sharp lower chest pain and shortness of breath for 2 days. Need nearby government hospital in Delhi or Hyderabad with low OPD cost...')}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
            <button
              onClick={toggleListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isListening ? t('ai_triage_listening', 'Listening...') : t('ai_triage_voice', 'Voice Input (Hands-free)')}</span>
            </button>

            <button
              onClick={() => handleAnalyze()}
              disabled={!symptomInput.trim() || isAnalyzing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                  <span>{t('ai_triage_analyzing', 'Agent Triage in Progress...')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('ai_triage_analyze_btn', 'Analyze & Suggest Hospitals')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] shrink-0 font-medium">Try Example:</span>
          {sampleComplaints.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSymptomInput(sample);
                handleAnalyze(sample);
              }}
              className="text-[11px] whitespace-nowrap px-3 py-1 rounded-xl bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              "{sample.slice(0, 40)}..."
            </button>
          ))}
        </div>
      </div>

      {analysisResult && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('ai_recommended_dept', 'Recommended Department')}
              </span>
              <div className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                <span>{analysisResult.specialty}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('ai_clinical_priority', 'Clinical Priority')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold px-3 py-1 rounded-xl border bg-amber-500/20 text-amber-300 border-amber-500/40">
                  {analysisResult.urgency} {t('ai_attention_advised', 'Attention Advised')}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('ai_hospital_matches', 'Hospital Matches')}
              </span>
              <div className="text-xl font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>{analysisResult.matchedHospitals.length} Centers</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Bot className="w-4 h-4" />
              <span>{t('ai_explanation_title', 'MediGuide Agent Clinical Explanation:')}</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{analysisResult.rationale}</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">
              {t('ai_top_recommended', 'Top Recommended Hospitals for')} {analysisResult.specialty}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.matchedHospitals.map((hosp) => (
                <div
                  key={hosp.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                          {hosp.uniqueCode}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" /> {hosp.city}, {hosp.state}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{hosp.name}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-amber-400 font-bold justify-end">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {hosp.rating}
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                        OPD: {hosp.estimatedConsultationCost === 0 ? t('hosp_free', 'FREE') : `₹${hosp.estimatedConsultationCost}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {hosp.distanceKm} km • {hosp.bedsAvailable} Beds Free
                    </span>

                    <button
                      onClick={() => onNavigateTab('hospitals')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 font-bold transition-all"
                    >
                      <span>Book OPD</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
