import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Stethoscope,
  Building2,
  Pill,
  ShieldAlert,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Calendar,
  Clock,
  Check,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { askGeminiOrSimulate, AgentResponse } from '../services/gemini';
import { voiceService } from '../services/speech';
import { storage } from '../services/storage';
import { agentBus } from '../services/agentBus';
import { useLanguage } from '../context/LanguageContext';
import { AgentId, AppointmentProposal } from '../types/agent';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  action?: AgentResponse['action'];
  isOutOfScope?: boolean;
  verifiedData?: AgentResponse['verifiedData'];
  proposal?: AppointmentProposal;
}

interface AgentFloatingAssistantProps {
  onNavigate: (tab: string) => void;
  userName?: string;
  activeRole: string;
}

interface RoleAgentMeta {
  agentId: AgentId;
  name: string;
  badge: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  buttonGradient: string;
  textAccent: string;
  bgBubble: string;
  borderAccent: string;
  defaultUserName: string;
  inputPlaceholder: Record<string, string>;
  samplePrompts: Record<string, string[]>;
  getWelcomeMessage: (name: string, lang: string) => string;
}

const ROLE_AGENTS: Record<string, RoleAgentMeta> = {
  patient: {
    agentId: 'user_agent',
    name: 'MediNav Citizen Copilot',
    badge: 'user_agent (Citizen LLM)',
    subtitle: 'Medical Guardrails & Public Hospital Navigation',
    icon: Bot,
    gradient: 'from-slate-900 via-slate-900 to-cyan-950/70',
    buttonGradient: 'from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500',
    textAccent: 'text-cyan-400',
    bgBubble: 'bg-cyan-500 text-slate-950',
    borderAccent: 'border-cyan-500/40',
    defaultUserName: 'Citizen',
    inputPlaceholder: {
      en: 'Ask health guidance, book OPD, reschedule slot, or "Open profile"...',
      te: 'ఆరోగ్య మార్గదర్శకత్వం, ఓపీడీ బుకింగ్, లేదా "ప్రొఫైల్ తెరువు" అని అడగండి...',
      hi: 'स्वास्थ्य मार्गदर्शन, ओपीडी बुकिंग, या "प्रोफाइल खोलो" पूछें...',
    },
    samplePrompts: {
      en: ['Open my profile', 'Show my tablet routine', 'Find hospitals in Telangana', 'Book General OPD appointment', 'Reschedule my appointment'],
      te: ['నా ప్రొఫైల్ తెరువు', 'మందుల పట్టిక చూపించు', 'తెలంగాణలో ఆసుపత్రులు', 'ఓపీడీ అపాయింట్‌మెంట్ బుక్ చేయండి', 'నా అపాయింట్‌మెంట్ రీషెడ్యూల్ చేయండి'],
      hi: ['मेरी प्रोफाइल खोलो', 'दवा दिनचर्या दिखाओ', 'तेलंगाना में अस्पताल खोजो', 'जनरल ओपीडी अपॉइंटमेंट बुक करो', 'मेरी अपॉइंटमेंट रीशेड्यूल करो'],
    },
    getWelcomeMessage: (name, lang) => {
      switch (lang) {
        case 'te':
          return `నమస్కారం ${name}! నేను మీ MediNav సిటిజెన్ కోపాయ్లెట్ (user_agent). ప్రభుత్వ ఆసుపత్రి సేవలు, జనరల్ ఓపీడీ బుకింగ్, స్లాట్ రీషెడ్యూల్ లేదా మందుల వివరాలు చూడటంలో నేను మీకు సహాయం చేస్తాను. "నా ప్రొఫైల్ తెరువు" లేదా "తెలంగాణలో ఆసుపత్రులు" అని అడగండి!`;
        case 'hi':
          return `नमस्ते ${name}! मैं आपका MediNav नागरिक कोपायलट (user_agent) हूँ। मैं आपको सरकारी अस्पताल खोजने, जनरल ओपीडी बुकिंग, अपॉइंटमेंट रीशेड्यूल करने या दवाइयों की दिनचर्या में सहायता कर सकता हूँ। मुझसे पूछें "मेरी प्रोफाइल खोलो" या "अस्पताल खोजो"!`;
        case 'ta':
          return `வணக்கம் ${name}! நான் உங்கள் MediNav குடிமக்கள் கோபிலாட் (user_agent). அரசு மருத்துவமனை ஓபிடி முன்பதிவு மற்றும் மாத்திரை அட்டவணைக்கு நான் உங்களுக்கு உதவ முடியும்.`;
        default:
          return `Namaste ${name}! I am your MediNav Citizen Copilot (user_agent). I can guide you through public hospital services, book General OPD visits, reschedule appointments, triage symptoms, or open your profile. Try asking "Find hospitals in Telangana" or "Reschedule my appointment"!`;
      }
    },
  },

  doctor: {
    agentId: 'doc_agent',
    name: 'DocAssist Clinical Copilot',
    badge: 'doc_agent (Clinical LLM)',
    subtitle: 'Clinical Course Manager & Pass Verification',
    icon: Stethoscope,
    gradient: 'from-slate-900 via-slate-900 to-violet-950/70',
    buttonGradient: 'from-violet-600 via-purple-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600',
    textAccent: 'text-violet-400',
    bgBubble: 'bg-violet-600 text-white',
    borderAccent: 'border-violet-500/40',
    defaultUserName: 'Dr. Rajesh Sharma, MD',
    inputPlaceholder: {
      en: 'Ask "How many appointments have today?", "Explain about appointment apt_...", or verify pass...',
      te: 'ఈరోజు ఎన్ని అపాయింట్‌మెంట్‌లు ఉన్నాయి?, PASS-XXXX ధృవీకరించండి, లేదా అపాయింట్‌మెంట్ వివరాలు...',
      hi: 'आज कितने अपॉइंटमेंट हैं?, PASS-XXXX सत्यापित करें, या अपॉइंटमेंट विवरण पूछें...',
    },
    samplePrompts: {
      en: [
        'How many appointments have today?',
        'Show today\'s OPD queue timetable',
        'Verify PASS-7729',
        'Review active medical courses',
        'Check Metformin & Amlodipine interaction',
      ],
      te: [
        'ఈరోజు ఎన్ని అపాయింట్‌మెంట్‌లు ఉన్నాయి?',
        'నేటి ఓపీడీ టైమ్‌టేబుల్ చూపించు',
        'PASS-7729 ధృవీకరించండి',
        'యాక్టివ్ మెడికల్ కోర్సులు',
        'మెట్‌ఫార్మిన్ & ఆమ్లోడిపైన్ పరస్పర చర్య',
      ],
      hi: [
        'आज मेरे कितने अपॉइंटमेंट हैं?',
        'आज का ओपीडी टाइमटेबल शेड्यूल दिखाओ',
        'PASS-7729 सत्यापित करें',
        'सक्रिय मेडिकल कोर्स देखें',
        'मेटफॉर्मिन और एम्लोडिपिन प्रभाव',
      ],
    },
    getWelcomeMessage: (name, lang) => {
      switch (lang) {
        case 'te':
          return `నమస్కారం డాక్టర్ గారూ! నేను DocAssist (doc_agent), మీ క్లినికల్ ఏఐ కోపాయ్లెట్. నేటి అపాయింట్‌మెంట్‌ల టైమ్‌టేబుల్ షెడ్యూల్, ఏదైనా అపాయింట్‌మెంట్ ఐడీ వివరాలు, రోగి పాస్‌కోడ్ (PASS-XXXX) ధృవీకరణ లేదా ఎమర్జెన్సీ ఓవర్‌రైడ్‌లలో నేను మీకు సహాయపడతాను. "ఈరోజు ఎన్ని అపాయింట్‌మెంట్‌లు ఉన్నాయి?" లేదా "PASS-7729 ధృవీకరించండి" అని అడగండి!`;
        case 'hi':
          return `नमस्ते डॉक्टर साहब! मैं DocAssist (doc_agent), आपका क्लिनिकल एआई कोपायलट हूँ। मैं आज के अपॉइंटमेंट की समय-सारणी (Timetable Schedule), किसी भी अपॉइंटमेंट आईडी का विवरण, मरीज का गुप्त पासकोड (PASS-XXXX) सत्यापित करने में आपकी सहायता करूँगा। "आज मेरे कितने अपॉइंटमेंट हैं?" पूछें!`;
        case 'ta':
          return `வணக்கம் மருத்துவரே! நான் DocAssist (doc_agent). இன்றைய சந்திப்பு அட்டவணை மற்றும் பாஸ்கோடு (PASS-XXXX) சரிபார்ப்புக்கு நான் உதவ முடியும்!`;
        default:
          return `Welcome Dr. ${name}! I am DocAssist (doc_agent), your specialized Clinical AI Copilot. I can analyze today\'s appointments queue in a timetable schedule, explain details for any Appointment ID, verify patient consultation pass codes (PASS-XXXX), or review drug safety. Try asking "How many appointments have today?" or "Explain about appointment apt_..."!`;
      }
    },
  },

  receptionist: {
    agentId: 'user_receptionist_agent',
    name: 'ReceptionDesk AI Copilot',
    badge: 'recp_agent (Front-Desk LLM)',
    subtitle: 'Doctor Check-in, Bed Capacity & Slot Coordination',
    icon: Building2,
    gradient: 'from-slate-900 via-slate-900 to-amber-950/70',
    buttonGradient: 'from-amber-500 via-orange-600 to-teal-700 hover:from-amber-400 hover:to-orange-500',
    textAccent: 'text-amber-400',
    bgBubble: 'bg-amber-500 text-slate-950',
    borderAccent: 'border-amber-500/40',
    defaultUserName: 'Front Desk Officer',
    inputPlaceholder: {
      en: 'Check doctor attendance, view bed capacity, check OPD schedule, or slot coordination...',
      te: 'డాక్టర్ల హాజరు స్థితి, బెడ్ల లభ్యత, లేదా నేటి అపాయింట్‌మెంట్లు అడగండి...',
      hi: 'डॉक्टर उपस्थिति स्थिति, बेड की उपलब्धता, या आज के अपॉइंटमेंट पूछें...',
    },
    samplePrompts: {
      en: ['Check doctor attendance status', 'Hospital bed capacity & occupancy', 'Show today\'s OPD appointments', 'Pharmacy restock alert summary'],
      te: ['డాక్టర్ల హాజరు స్థితి పరిశీలించు', 'హాస్పిటల్ బెడ్ల లభ్యత వివరాలు', 'నేటి ఓపీడీ అపాయింట్‌మెంట్లు', 'ఫార్మసీ రీస్టాక్ అలర్ట్‌లు'],
      hi: ['डॉक्टर उपस्थिति स्थिति जांचें', 'अस्पताल बेड क्षमता और उपलब्धता', 'आज के ओपीडी अपॉइंटमेंट दिखाओ', 'फार्मेसी रीस्टॉक अलर्ट'],
    },
    getWelcomeMessage: (name, lang) => {
      switch (lang) {
        case 'te':
          return `నమస్కారం రిసెప్షన్ డెస్క్! నేను మీ ReceptionDesk కోపాయ్లెట్ (user_receptionist_agent). డాక్టర్ల హాజరు/చెక్-ఇన్ స్థితి, ఆసుపత్రి బెడ్ల లభ్యత, నేటి ఓపీడీ అపాయింట్‌మెంట్ల సమన్వయం మరియు ఫార్మసీ రీస్టాక్ నోటిఫికేషన్లలో నేను మీకు సహాయపడతాను.`;
        case 'hi':
          return `नमस्ते रिसेप्शन डेस्क! मैं आपका ReceptionDesk कोपायलट (user_receptionist_agent) हूँ। मैं डॉक्टरों की उपस्थिति, अस्पताल में उपलब्ध बेड, ओपीडी कतार प्रबंधन और फार्मेसी रीस्टॉक अलर्ट में आपकी सहायता कर सकता हूँ।`;
        default:
          return `Welcome to Hospital Front-Desk! I am ReceptionDesk Copilot (user_receptionist_agent). I can verify doctor on-duty check-ins, monitor hospital bed occupancy across wards, coordinate patient OPD queue flow, and check pharmacy restock alerts.`;
      }
    },
  },

  pharmacy: {
    agentId: 'pharm_agent',
    name: 'PharmaDesk Dispensary Copilot',
    badge: 'pharm_agent (Pharmacy LLM)',
    subtitle: 'Inventory Sentinel & Subsidized Billing',
    icon: Pill,
    gradient: 'from-slate-900 via-slate-900 to-emerald-950/70',
    buttonGradient: 'from-emerald-500 via-teal-600 to-cyan-700 hover:from-emerald-400 hover:to-teal-500',
    textAccent: 'text-emerald-400',
    bgBubble: 'bg-emerald-500 text-slate-950',
    borderAccent: 'border-emerald-500/40',
    defaultUserName: 'Chief Pharmacist',
    inputPlaceholder: {
      en: 'Check low stock, search Paracetamol/Amoxicillin, calculate 25% Ayushman discount...',
      te: 'తక్కువగా ఉన్న మందుల వివరాలు, పారాసిటమాల్ స్టాక్, ఆయుష్మాన్ 25% సబ్సిడీ అడగండి...',
      hi: 'कम स्टॉक दवाइयाँ, पैरासिटामोल/एमोक्सिसिलिन खोजें, 25% आयुष्मान छूट जांचें...',
    },
    samplePrompts: {
      en: ['Check low stock medicines', 'Search Paracetamol 650mg stock & price', 'Calculate 25% Ayushman Bharat discount', 'View pharmacy bills history'],
      te: ['తక్కువగా ఉన్న మందుల నిల్వలు', 'పారాసిటమాల్ 650mg స్టాక్ మరియు ధర', 'ఆయుష్మాన్ భారత్ 25% సబ్సిడీ లెక్కించు', 'ఫార్మసీ బిల్లుల చరిత్ర'],
      hi: ['कम स्टॉक वाली दवाइयाँ दिखाओ', 'पैरासिटामोल 650mg स्टॉक और कीमत', '25% आयुष्मान भारत छूट की गणना करें', 'फार्मेसी बिलों का इतिहास'],
    },
    getWelcomeMessage: (name, lang) => {
      switch (lang) {
        case 'te':
          return `స్వాగతం ఫార్మసీ కౌంటర్! నేను PharmaDesk కోపాయ్లెట్ (pharm_agent). జనరిక్ మందుల స్టాక్ తనిఖీ, కనిష్ట పరిమితి కంటే తక్కువగా ఉన్న మందుల గుర్తింపు, ఆయుష్మాన్ భారత్ 25% సబ్సిడీ మరియు జన్ ఔషధి బిల్లింగ్‌లో నేను మీకు సహాయపడతాను.`;
        case 'hi':
          return `फार्मेसी काउंटर में आपका स्वागत है! मैं PharmaDesk कोपायलट (pharm_agent) हूँ। मैं जेनेरिक दवा स्टॉक, न्यूनतम थ्रेशोल्ड से कम इन्वेंटरी अलर्ट, 25% आयुष्मान भारत छूट और जन औषधि बिलिंग में आपकी सहायता कर सकता हूँ।`;
        default:
          return `Welcome to Jan Aushadhi Dispensary! I am PharmaDesk Copilot (pharm_agent). I monitor medicine stock levels below minimum thresholds, look up generic formulations, compute 25% Ayushman Bharat subsidized pricing, and assist with PDF bill dispatching.`;
      }
    },
  },

  admin: {
    agentId: 'admin_agent',
    name: 'SuperAdmin National Copilot',
    badge: 'admin_agent (National Hub LLM)',
    subtitle: 'Supervisory Mesh & National Analytics',
    icon: ShieldAlert,
    gradient: 'from-slate-900 via-slate-900 to-rose-950/70',
    buttonGradient: 'from-rose-500 via-pink-600 to-indigo-700 hover:from-rose-400 hover:to-pink-500',
    textAccent: 'text-rose-400',
    bgBubble: 'bg-rose-500 text-white',
    borderAccent: 'border-rose-500/40',
    defaultUserName: 'Administrator',
    inputPlaceholder: {
      en: 'Inspect 8-agent mesh, check latency, nationwide bed occupancy across 33 states...',
      te: '8-ఏజెంట్ నెట్‌వర్క్ స్థితి, లేటెన్సీ, 33 రాష్ట్రాల బెడ్ల ఆక్యుపెన్సీ అడగండి...',
      hi: '8-एजेंट मेश स्थिति, विलंबता, 33 राज्यों में राष्ट्रीय बेड ऑक्यूपेंसी जांचें...',
    },
    samplePrompts: {
      en: ['Inspect 8-agent mesh status & latency', 'National bed occupancy analytics across 33 states', 'Show recent agent audit logs', 'List active hospitals in system'],
      te: ['8-ఏజెంట్ నెట్‌వర్క్ మరియు లేటెన్సీ వివరాలు', '33 రాష్ట్రాల జాతీయ బెడ్ల ఆక్యుపెన్సీ గణాంకాలు', 'ఇటీవలి ఏజెంట్ ఆడిట్ లాగ్‌లు', 'సిస్టమ్‌లోని ఆసుపత్రుల జాబితా'],
      hi: ['8-एजेंट मेश स्थिति और लेटेंसी जांचें', '33 राज्यों में राष्ट्रीय बेड ऑक्यूपेंसी विश्लेषण', 'हालिया एजेंट ऑडिट लॉग दिखाओ', 'सक्रिय अस्पतालों की सूची'],
    },
    getWelcomeMessage: (name, lang) => {
      switch (lang) {
        case 'te':
          return `అడ్మినిస్ట్రేటర్ గారికి స్వాగతం! నేను SuperAdmin కోపాయ్లెట్ (admin_agent). 8-ఏజెంట్ జాతీయ ఆరోగ్య నెట్‌వర్క్ పర్యవేక్షణ, సందేశాల లేటెన్సీ, సెక్యూరిటీ ఆడిట్ లాగ్‌లు మరియు 33 రాష్ట్రాల ప్రభుత్వ ఆసుపత్రుల బెడ్ల గణాంకాలను నేను మీకు అందిస్తాను.`;
        case 'hi':
          return `राष्ट्रीय प्रशासनिक हब में स्वागत है! मैं SuperAdmin कोपायलट (admin_agent) हूँ। मैं 8-एजेंट राष्ट्रीय नेटवर्क की निगरानी, संदेश लेटेंसी, सुरक्षा ऑडिट लॉग और 33 राज्यों के अस्पतालों में बेड क्षमता की रिपोर्ट प्रदान करता हूँ।`;
        default:
          return `Welcome Administrator! I am SuperAdmin Omniscient Hub (admin_agent). I oversee the 8-agent micro-service mesh, track inter-agent message latencies, audit real-time bus traffic, monitor national bed occupancy across all 33 Indian States/UTs, and enforce ABDM compliance.`;
      }
    },
  },
};

export const AgentFloatingAssistant: React.FC<AgentFloatingAssistantProps> = ({
  onNavigate,
  userName = 'Citizen',
  activeRole,
}) => {
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Active Role Config
  const roleConfig = ROLE_AGENTS[activeRole] || ROLE_AGENTS.patient;
  const ActiveIcon = roleConfig.icon;

  const getEffectiveUserName = () => {
    if (activeRole === 'doctor') return 'Dr. Rajesh Sharma, MD';
    if (activeRole === 'receptionist') return 'Front Desk Staff';
    if (activeRole === 'pharmacy') return 'Chief Pharmacist';
    if (activeRole === 'admin') return 'National Director';
    return userName || 'Citizen';
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome_' + activeRole,
      sender: 'agent',
      text: roleConfig.getWelcomeMessage(getEffectiveUserName(), currentLanguage),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset messages when activeRole changes so Doctor gets doc_agent, Pharmacy gets pharm_agent, etc.
  useEffect(() => {
    setMessages([
      {
        id: 'msg_welcome_' + activeRole + '_' + Date.now(),
        sender: 'agent',
        text: roleConfig.getWelcomeMessage(getEffectiveUserName(), currentLanguage),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [activeRole]);

  // Refresh message if language changes
  useEffect(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg_lang_' + Date.now(),
        sender: 'agent',
        text: roleConfig.getWelcomeMessage(getEffectiveUserName(), currentLanguage),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [currentLanguage]);

  // Listen for direct queries requested by other components (e.g. Appointment Details modal)
  useEffect(() => {
    const handleAskAssistant = (e: any) => {
      if (e.detail?.query) {
        setIsOpen(true);
        handleSend(e.detail.query);
      }
    };
    window.addEventListener('mediguide:ask-assistant', handleAskAssistant);
    return () => window.removeEventListener('mediguide:ask-assistant', handleAskAssistant);
  }, [activeRole, currentLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await askGeminiOrSimulate(query, {
        agentId: roleConfig.agentId,
        activeRole,
        userName: getEffectiveUserName(),
        language: currentLanguage,
      });

      const agentMsg: ChatMessage = {
        id: 'agt_' + Date.now(),
        sender: 'agent',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: response.action,
        isOutOfScope: response.isOutOfScope,
        verifiedData: response.verifiedData,
        proposal: response.proposal || response.action?.proposal,
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If doctor successfully verified a passcode or appointment officially confirmed, trigger celebratory confetti!
      if (
        response.verifiedData ||
        response.action?.type === 'VERIFY_PASS' ||
        response.action?.type === 'CONFIRM_APPOINTMENT'
      ) {
        confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mediguide:appointment-updated', {
              detail: { passCode: response.action?.passCode, status: 'Confirmed' },
            })
          );
        }
      }

      agentBus.dispatch(
        roleConfig.agentId,
        'user_ui',
        response.isOutOfScope ? 'OUT_OF_SCOPE_REJECTED' : response.action ? 'NAVIGATE' : 'GENERAL_CHAT',
        { query, action: response.action, verifiedData: response.verifiedData },
        `${roleConfig.agentId} replied to "${query.slice(0, 35)}..."`
      );

      // Handle Role-appropriate In-App Actions
      if (
        response.action &&
        (response.action.type === 'NAVIGATE' ||
          response.action.type === 'CANCEL_APPOINTMENT' ||
          response.action.type === 'CONFIRM_APPOINTMENT')
      ) {
        const target = response.action.target;
        if (activeRole === 'patient') {
          onNavigate(target);
        } else if (activeRole === 'doctor') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mediguide:doctor-tab', { detail: { tab: target } }));
          }
        } else if (activeRole === 'pharmacy') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mediguide:pharmacy-tab', { detail: { tab: target } }));
          }
        } else if (activeRole === 'admin') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mediguide:admin-tab', { detail: { tab: target } }));
          }
        }
      } else if (response.action && response.action.type === 'FILTER_HOSPITALS') {
        onNavigate('hospitals');
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('mediguide:filter-hospitals', {
                detail: response.action?.filter,
              })
            );
          }, 100);
        }
      }

      const activeSpeechLang = response.detectedLanguage || currentLanguage;
      if (response.detectedLanguage && response.detectedLanguage !== currentLanguage) {
        setLanguage(response.detectedLanguage as any);
      }

      if (isSpeakingEnabled) {
        voiceService.speak(response.reply, activeSpeechLang);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'agent',
          text: 'I encountered a communication delay. Please inspect the Agent Bus or retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
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
        (transcript) => {
          setIsListening(false);
          setInput(transcript);
          handleSend(transcript);
        },
        () => setIsListening(false)
      );
    }
  };

  const currentSamplePrompts =
    roleConfig.samplePrompts[currentLanguage] ||
    roleConfig.samplePrompts.en ||
    Object.values(roleConfig.samplePrompts)[0];

  const currentPlaceholder =
    roleConfig.inputPlaceholder[currentLanguage] ||
    roleConfig.inputPlaceholder.en ||
    'Ask copilot guidance...';

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r ${roleConfig.buttonGradient} text-white font-bold shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all group border border-white/20`}
          >
            <div className="relative">
              <ActiveIcon className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
            </div>
            <span className="text-xs tracking-wide">
              {roleConfig.name}
            </span>
            <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded-full border border-white/10 font-mono">
              {roleConfig.badge.split(' ')[0]}
            </span>
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isExpanded ? 'w-[90vw] md:w-[650px] h-[80vh]' : 'w-[92vw] sm:w-[420px] h-[580px]'
          }`}
        >
          <div className={`px-5 py-3.5 bg-gradient-to-r ${roleConfig.gradient} border-b border-slate-800 flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${roleConfig.buttonGradient} flex items-center justify-center shadow-md`}>
                <ActiveIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white tracking-tight">
                    {roleConfig.name}
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className={`w-3 h-3 ${roleConfig.textAccent}`} />
                  {roleConfig.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
                title={isSpeakingEnabled ? 'Mute Voice' : 'Enable Voice'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {isSpeakingEnabled ? <Volume2 className={`w-4 h-4 ${roleConfig.textAccent}`} /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar tailored to Active Agent */}
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            {currentSamplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-slate-700/80 hover:text-white text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? `${roleConfig.bgBubble} font-medium rounded-br-none`
                      : msg.isOutOfScope
                      ? 'bg-amber-950/40 text-amber-200 border border-amber-800/50 rounded-bl-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Verification Banner */}
                  {msg.verifiedData && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-500/30 flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Validated Code: {msg.verifiedData.passCode} for {msg.verifiedData.patientName}</span>
                    </div>
                  )}

                  {/* Interactive Appointment Proposal Card */}
                  {msg.proposal && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>OPD Appointment Proposal</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                          Not Booked Yet
                        </span>
                      </div>

                      <div className="text-[11px] space-y-1">
                        <div className="flex items-start justify-between">
                          <span className="text-slate-400">Hospital:</span>
                          <span className="font-semibold text-white text-right">{msg.proposal.hospitalName}</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <span className="text-slate-400">Doctor:</span>
                          <span className="font-semibold text-cyan-300 text-right">
                            {msg.proposal.doctorName} ({msg.proposal.department})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Date:</span>
                          <span className="font-medium text-white">{msg.proposal.date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Selected Slot:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{msg.proposal.requestedSlot}</span>
                            {msg.proposal.isSlotConflict ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3 text-amber-400" /> Busy
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3 text-emerald-400" /> Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Flexible Time Slots */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Flexible Alternative Time Slots:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(msg.proposal.availableSlots && msg.proposal.availableSlots.length > 0
                            ? msg.proposal.availableSlots.slice(0, 6)
                            : ['09:30 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '03:00 PM']
                          ).map((slot, sIdx) => {
                            const isSelected = msg.proposal?.requestedSlot === slot;
                            return (
                              <button
                                key={sIdx}
                                onClick={() => handleSend(`Select ${slot}`)}
                                className={`text-[10px] px-2 py-1 rounded-lg transition-all font-medium cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white'
                                }`}
                              >
                                {slot} {isSelected && '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quick Date Selector */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Change Date:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSend('Change date to tomorrow')}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-all cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <button
                            onClick={() => handleSend('Change date to day after tomorrow')}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-all cursor-pointer"
                          >
                            Day After Tomorrow
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: Confirm & Cancel */}
                      <div className="pt-2.5 border-t border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => handleSend('Confirm appointment')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm & Book</span>
                        </button>

                        <button
                          onClick={() => handleSend('Cancel appointment request')}
                          className="py-1.5 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 font-medium text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-500 text-center italic">
                        ℹ️ This request is never saved to your appointment history unless confirmed.
                      </p>
                    </div>
                  )}

                  {msg.action && msg.action.type !== 'PROPOSE_APPOINTMENT' && msg.action.type !== 'CANCEL_PROPOSAL' && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                      <span className={`flex items-center gap-1 ${roleConfig.textAccent} font-semibold`}>
                        <Compass className="w-3.5 h-3.5 animate-spin" />
                        Target: {msg.action.target.toUpperCase()}
                      </span>
                      <button
                        onClick={() => {
                          if (activeRole === 'patient') {
                            onNavigate(msg.action!.target);
                          } else if (activeRole === 'doctor') {
                            window.dispatchEvent(new CustomEvent('mediguide:doctor-tab', { detail: { tab: msg.action!.target } }));
                          } else if (activeRole === 'pharmacy') {
                            window.dispatchEvent(new CustomEvent('mediguide:pharmacy-tab', { detail: { tab: msg.action!.target } }));
                          } else if (activeRole === 'admin') {
                            window.dispatchEvent(new CustomEvent('mediguide:admin-tab', { detail: { tab: msg.action!.target } }));
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 ${roleConfig.textAccent} hover:bg-white/20 font-bold transition-all`}
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl w-fit border border-slate-800">
                <span className={`w-2 h-2 rounded-full ${roleConfig.textAccent.replace('text-', 'bg-')} animate-ping`}></span>
                <span>{roleConfig.name} is reasoning...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-slate-950 border-t border-slate-800">
            {isListening && (
              <div className={`mb-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-between text-xs ${roleConfig.textAccent} animate-pulse`}>
                <span className="flex items-center gap-2">
                  <Mic className={`w-3.5 h-3.5 ${roleConfig.textAccent}`} /> Listening... Speak now
                </span>
                <button
                  onClick={toggleListening}
                  className="text-[10px] underline hover:text-white"
                >
                  Stop
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={toggleListening}
                title="Voice Input (Hands-free Mode)"
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-bounce'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={currentPlaceholder}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`p-2.5 rounded-xl bg-gradient-to-r ${roleConfig.buttonGradient} disabled:opacity-40 text-white font-bold transition-all shadow-md cursor-pointer`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
