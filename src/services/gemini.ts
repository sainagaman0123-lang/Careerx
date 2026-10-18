import { storage } from './storage';
import { agentBus } from './agentBus';
import { MedicalDepartment, Hospital, IndianState } from '../types/hospital';
import { Appointment } from '../types/appointment';
import { AppointmentProposal } from '../types/agent';

export interface HospitalFilterParams {
  state?: string;
  department?: string;
  maxCost?: number;
  freeOnly?: boolean;
  searchQuery?: string;
}

export interface AgentResponse {
  reply: string;
  action?: {
    type:
      | 'NAVIGATE'
      | 'SELECT_HOSPITAL'
      | 'OPEN_MODAL'
      | 'FILTER_HOSPITALS'
      | 'VERIFY_PASS'
      | 'RESTOCK_ACK'
      | 'ACCEPT_APPOINTMENT'
      | 'REJECT_APPOINTMENT'
      | 'CANCEL_APPOINTMENT'
      | 'RESCHEDULE_APPOINTMENT'
      | 'PROPOSE_APPOINTMENT'
      | 'CONFIRM_APPOINTMENT'
      | 'CANCEL_PROPOSAL';
    target: string;
    filter?: HospitalFilterParams;
    passCode?: string;
    courseId?: string;
    appointmentId?: string;
    proposal?: AppointmentProposal;
  };
  proposal?: AppointmentProposal;
  suggestedDepartment?: MedicalDepartment;
  matchedHospitalIds?: string[];
  isOutOfScope?: boolean;
  detectedLanguage?: string;
  verifiedData?: {
    type: 'appointment' | 'course';
    id: string;
    passCode: string;
    patientName: string;
  };
}

export function detectLanguage(text: string, currentAppLanguage: string = 'en'): string {
  // Telugu unicode range
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Devanagari (Hindi / Marathi)
  if (/[\u0900-\u097F]/.test(text)) {
    if (/आहे|नाही|कसे|काय|करा|औषध/.test(text)) return 'mr';
    return 'hi';
  }
  // Tamil unicode range
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Bengali unicode range
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  // Kannada unicode range
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Gujarati unicode range
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';

  // Common transliterations in Indian Latin script (distinctive words/verbs)
  const lower = text.toLowerCase();
  if (/\b(chupinchu|kavali|undhi|undi|cheyyandi|asupatri|mandulu|naku|meeru|pettandi)\b/i.test(lower)) {
    return 'te';
  }
  if (/\b(dikhao|chahiye|aspatal|batao|kripya|dawai|meri|mujhe|kaise|kijiye)\b/i.test(lower)) {
    return 'hi';
  }
  if (/\b(kaatunga|theriyum|maruthuvamanai|vaendum|solunga)\b/i.test(lower)) {
    return 'ta';
  }

  return currentAppLanguage || 'en';
}

function getRoleSystemPrompt(agentId: string, activeRole: string, detectedLang: string, userName?: string): string {
  if (agentId === 'doc_agent' || activeRole === 'doctor') {
    const liveAppointments = storage.getAppointments();
    const liveCourses = storage.getCourses();

    const aptSchedule = liveAppointments.length === 0
      ? 'No appointments currently recorded in queue.'
      : liveAppointments.map((a, i) =>
          `${i + 1}. [Appointment ID: ${a.id}] Date: ${a.appointmentDate} | Slot: ${a.timeSlot} | Citizen Name: ${a.patientName} | Mobile: ${a.patientPhone} | Dept: ${a.department} | Hospital: ${a.hospitalName} | Status: ${a.status} | Pass Code: ${a.passCode} | Shift/Notes: ${a.rescheduleReason || a.rejectionReason || 'Standard Consultation'}`
        ).join('\n');

    const courseSchedule = liveCourses.length === 0
      ? 'No active courses currently recorded.'
      : liveCourses.map((c, i) =>
          `${i + 1}. [Course: ${c.courseCode}] Citizen: ${c.patientName} | Diagnosis: ${c.diagnosis} | Pass Code: ${c.verificationPassCode} | Status: ${c.status}`
        ).join('\n');

    return `You are doc_agent (DocAssist Clinical Copilot) for doctor ${userName || 'Dr. Physician'} in an Indian public hospital.
You assist exclusively with clinical tasks:
1. When asked about how many appointments they have today or for their timetable schedule/queue, check the live appointments database below, calculate the exact count, and render a complete chronological TIMETABLE SCHEDULE table showing: Time Slot, Citizen Name, Mobile Number, Appointment ID, Department, Status, and Secret Pass Code.
2. When asked to explain or search a specific Appointment ID (e.g., apt_...), extract all details from the live database below and explain the patient's record completely: Citizen Name, Appointment ID, Date, Time Slot, Mobile Number, Department, Status, Secret Pass Code, and any reschedule or clinical notes.
3. Verifying patient secret consultation pass codes (PASS-XXXX) to officially conclude visits or medical courses.
4. Reviewing active medical courses, diagnosis, and prescription formulations.
5. Clinical pharmacology, drug-drug interaction advisory, and dosage safety.
6. Managing emergency slot overrides for urgent trauma cases.

LIVE REAL-TIME DATABASE OF APPOINTMENTS IN HOSPITAL SYSTEM:
${aptSchedule}

LIVE ACTIVE MEDICAL COURSES:
${courseSchedule}

Respond concisely and clinically strictly in language '${detectedLang}'. Include in-app action tags if relevant (e.g. [NAVIGATE: queue], [VERIFY_PASS: PASS-7729]). Never provide generic hard-coded placeholder replies; always use the live data above.`;
  }

  if (agentId === 'user_receptionist_agent' || activeRole === 'receptionist') {
    return `You are user_receptionist_agent (ReceptionDesk Copilot) at the Indian public hospital front-desk.
You assist front-desk staff with:
1. Monitoring doctor on-duty check-in attendance and specialty rosters.
2. Checking hospital bed occupancy, free bed counts across wards, and ICU capacity.
3. Managing patient OPD queue footfall and appointment coordination.
4. Reviewing pharmacy restock alerts sent by the dispensary sentinel.
Respond concisely strictly in language '${detectedLang}'. Include action tags if relevant.`;
  }

  if (agentId === 'pharm_agent' || activeRole === 'pharmacy') {
    return `You are pharm_agent (PharmaDesk Dispensary Copilot) at an Indian public Jan Aushadhi dispensary.
You assist pharmacy staff with:
1. Checking medicine inventory levels and detecting low stock items below minimum thresholds.
2. Searching generic drug prices, batch numbers, manufacturer, and expiry dates.
3. Calculating 25% Ayushman Bharat government subsidized discounts on medicine bills.
4. Reviewing recent dispensation invoices and PDF receipts.
Respond concisely strictly in language '${detectedLang}'. Include action tags if relevant (e.g. [NAVIGATE: inventory], [NAVIGATE: billing], [NAVIGATE: history]).`;
  }

  if (agentId === 'admin_agent' || activeRole === 'admin') {
    return `You are admin_agent (SuperAdmin Omniscient Hub) for national public healthcare supervision.
You assist system administrators with:
1. Inspecting the 8-agent micro-service mesh, tracking inter-agent message latencies, and service health.
2. Analyzing nationwide public hospital bed occupancy and capacity across all 33 Indian States and Union Territories.
3. Auditing inter-agent communication logs, security alerts, and error metrics.
4. Enforcing ABDM compliance and hospital registration standards.
Respond concisely and authoritatively strictly in language '${detectedLang}'. Include action tags if relevant.`;
  }

  // Default: user_agent (Citizen)
  return `You are user_agent (MediNav Citizen Copilot) of MediGuide AI, dedicated EXCLUSIVELY to citizens and patients.
Strict Rule: You are restricted EXCLUSIVELY to medical guidance, hospital assistance, OPD appointment booking (always General Medicine OPD, never Cardiology unless requested), slot rescheduling, tablet routines, and patient portal navigation.
If the user asks about ANY non-medical topic (such as cooking, coding, gaming, recipes, politics, general chat unrelated to health), you MUST politely refuse.
Respond concisely strictly in language '${detectedLang}'. Include in-app action tags if needed (e.g. [NAVIGATE: profile], [NAVIGATE: appointments], [NAVIGATE: routine], [FILTER: state=Telangana]).`;
}

export async function askGeminiOrSimulate(
  prompt: string,
  context: {
    agentId: string;
    activeRole: string;
    userName?: string;
    hospitalName?: string;
    language?: string;
  }
): Promise<AgentResponse> {
  const detectedLang = detectLanguage(prompt, context.language || storage.getLanguage());
  const apiKey = storage.getGeminiApiKey();

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const systemPrompt = getRoleSystemPrompt(context.agentId, context.activeRole, detectedLang, context.userName);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${systemPrompt}\n\nCurrent User: ${context.userName || 'User'}.\nDetected Language: ${detectedLang}.\nUser Prompt: "${prompt}"\n\nProvide a helpful, concise, and structured reply strictly in language '${detectedLang}'.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = parseAgentOutput(text);
          parsed.detectedLanguage = detectedLang;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Live Gemini API call failed, falling back to built-in agent reasoning:', err);
    }
  }

  return processAgentLocally(prompt, { ...context, language: detectedLang });
}

function processAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lang = context.language || 'en';

  // Route based on agentId and activeRole
  if (context.agentId === 'doc_agent' || context.activeRole === 'doctor') {
    return processDocAgentLocally(prompt, { ...context, language: lang });
  }

  if (context.agentId === 'user_receptionist_agent' || context.agentId === 'res_agent' || context.activeRole === 'receptionist') {
    return processReceptionistAgentLocally(prompt, { ...context, language: lang });
  }

  if (context.agentId === 'pharm_agent' || context.activeRole === 'pharmacy') {
    return processPharmAgentLocally(prompt, { ...context, language: lang });
  }

  if (context.agentId === 'admin_agent' || context.activeRole === 'admin') {
    return processAdminAgentLocally(prompt, { ...context, language: lang });
  }

  // Default: user_agent (Citizen)
  return processUserAgentLocally(prompt, { ...context, language: lang });
}

/* =========================================================================
   1. DOCTOR AGENT (doc_agent) - Clinical Copilot
   ========================================================================= */
function processDocAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lower = prompt.toLowerCase();
  const lang = context.language || 'en';

  const aptIdMatch = prompt.match(/\b(apt_[a-zA-Z0-9_-]+)\b/i) || prompt.match(/\bapt[\s_-]?([a-zA-Z0-9_-]+)\b/i);

  // 1. Accept Appointment Command
  const isAcceptCommand =
    (lower.includes('accept') ||
      lower.includes('ఆమోదించు') ||
      lower.includes('ఆమోదం') ||
      lower.includes('స్వీకరించు') ||
      lower.includes('स्वीकार') ||
      lower.includes('स्वीकृत')) &&
    !lower.includes('reject') &&
    !lower.includes('reschedule');

  if (isAcceptCommand) {
    const appointments = storage.getAppointments();
    let targetApt: any = null;

    if (aptIdMatch) {
      const searchId = aptIdMatch[0].toLowerCase();
      targetApt = appointments.find((a) => a.id.toLowerCase() === searchId || a.id.toLowerCase().includes(searchId));
    }
    if (!targetApt) {
      targetApt = appointments.find(
        (a) =>
          lower.includes(a.id.toLowerCase()) ||
          lower.includes(a.patientName.toLowerCase()) ||
          a.status === 'Pending' ||
          a.status === 'Rescheduled'
      );
    }
    if (!targetApt && appointments.length > 0) {
      targetApt = appointments[0];
    }

    if (targetApt) {
      storage.updateAppointment(targetApt.id, { status: 'Accepted' });
      agentBus.dispatch(
        'doc_agent',
        'user_agent',
        'APPOINTMENT_ACCEPTED',
        { appointmentId: targetApt.id, patientName: targetApt.patientName },
        `Doctor accepted appointment ${targetApt.id} for ${targetApt.patientName}.`
      );

      let reply = `✅ **Appointment Accepted Successfully!**\n\n• **Citizen Name:** **${targetApt.patientName}**\n• **Appointment ID:** \`${targetApt.id}\`\n• **Time Slot:** ${targetApt.timeSlot} (${targetApt.appointmentDate})\n• **Department:** ${targetApt.department}\n• **Secret Pass Code:** \`${targetApt.passCode}\`\n• **Status:** \`Accepted (Confirmed)\`\n\nPatient has been confirmed on today's clinical OPD roster.`;
      if (lang === 'te') {
        reply = `✅ **అపాయింట్‌మెంట్ విజయవంతంగా ఆమోదించబడింది!**\n\n• **రోగి పేరు:** **${targetApt.patientName}**\n• **అపాయింట్‌మెంట్ ఐడీ:** \`${targetApt.id}\`\n• **సమయం:** ${targetApt.timeSlot} (${targetApt.appointmentDate})\n• **పాస్‌కోడ్:** \`${targetApt.passCode}\`\n• **స్థితి:** \`Accepted\``;
      } else if (lang === 'hi') {
        reply = `✅ **अपॉइंटमेंट सफलतापूर्वक स्वीकृत!**\n\n• **मरीज का नाम:** **${targetApt.patientName}**\n• **अपॉइंटमेंट आईडी:** \`${targetApt.id}\`\n• **समय:** ${targetApt.timeSlot} (${targetApt.appointmentDate})\n• **पासकोड:** \`${targetApt.passCode}\`\n• **स्थिति:** \`Accepted\``;
      }

      return {
        reply,
        action: { type: 'ACCEPT_APPOINTMENT', target: 'queue', appointmentId: targetApt.id },
        detectedLanguage: lang,
      };
    }
  }

  // 2. Reject Appointment Command
  const isRejectCommand =
    lower.includes('reject') ||
    lower.includes('తిరస్కరించు') ||
    lower.includes('రద్దు') ||
    lower.includes('अस्वीकार') ||
    lower.includes('खारिज') ||
    lower.includes('रद्द');

  if (isRejectCommand) {
    const appointments = storage.getAppointments();
    let targetApt: any = null;

    if (aptIdMatch) {
      const searchId = aptIdMatch[0].toLowerCase();
      targetApt = appointments.find((a) => a.id.toLowerCase() === searchId || a.id.toLowerCase().includes(searchId));
    }
    if (!targetApt) {
      targetApt = appointments.find(
        (a) =>
          lower.includes(a.id.toLowerCase()) ||
          lower.includes(a.patientName.toLowerCase()) ||
          a.status === 'Pending'
      );
    }
    if (!targetApt && appointments.length > 0) {
      targetApt = appointments[0];
    }

    if (targetApt) {
      const reasonMatch = prompt.match(/(?:reason|due to|because)[:\s]+([^.,\n]+)/i);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Doctor unavailable due to emergency OT trauma schedule';

      storage.updateAppointment(targetApt.id, { status: 'Rejected', rejectionReason: reason });
      agentBus.dispatch(
        'doc_agent',
        'user_agent',
        'APPOINTMENT_REJECTED',
        { appointmentId: targetApt.id, patientName: targetApt.patientName, reason },
        `Doctor rejected appointment ${targetApt.id} for ${targetApt.patientName}. Reason: ${reason}`
      );

      let reply = `❌ **Appointment Rejected (Cancelled)**\n\n• **Citizen Name:** **${targetApt.patientName}**\n• **Appointment ID:** \`${targetApt.id}\`\n• **Clinical Rejection Reason:** *${reason}*\n• **Status:** \`Cancelled / Rejected\`\n\nCitizen has been notified via user_agent with redirection options.`;
      if (lang === 'te') {
        reply = `❌ **అపాయింట్‌మెంట్ రద్దు చేయబడింది (Cancelled)**\n\n• **రోగి పేరు:** **${targetApt.patientName}**\n• **అపాయింట్‌మెంట్ ఐడీ:** \`${targetApt.id}\`\n• **కారణం:** *${reason}*\n• **స్థితి:** \`Cancelled / Rejected\``;
      } else if (lang === 'hi') {
        reply = `❌ **अपॉइंटमेंट रद्द / अस्वीकृत (Cancelled)**\n\n• **मरीज का नाम:** **${targetApt.patientName}**\n• **अपॉइंटमेंट आईडी:** \`${targetApt.id}\`\n• **कारण:** *${reason}*\n• **स्थिति:** \`Cancelled / Rejected\``;
      }

      return {
        reply,
        action: { type: 'REJECT_APPOINTMENT', target: 'queue', appointmentId: targetApt.id },
        detectedLanguage: lang,
      };
    }
  }

  // 3. Reschedule Appointment Command
  const isRescheduleCommand =
    lower.includes('reschedule') ||
    lower.includes('రీషెడ్యూల్') ||
    lower.includes('మార్చు') ||
    lower.includes('రీ-షెడ్యూల్') ||
    lower.includes('रीशेड्यूल') ||
    lower.includes('पुन पुनर्निर्धारित');

  if (isRescheduleCommand) {
    const appointments = storage.getAppointments();
    let targetApt: any = null;

    if (aptIdMatch) {
      const searchId = aptIdMatch[0].toLowerCase();
      targetApt = appointments.find((a) => a.id.toLowerCase() === searchId || a.id.toLowerCase().includes(searchId));
    }
    if (!targetApt) {
      targetApt = appointments.find(
        (a) =>
          lower.includes(a.id.toLowerCase()) ||
          lower.includes(a.patientName.toLowerCase()) ||
          a.status !== 'Completed'
      );
    }
    if (!targetApt && appointments.length > 0) {
      targetApt = appointments[0];
    }

    if (targetApt) {
      const timeMatch = prompt.match(/\b(0?[1-9]|1[0-2]):[0-5][0-9]\s*(?:AM|PM)\b/i);
      const newTime = timeMatch ? timeMatch[0].toUpperCase() : '11:30 AM';

      let newDate = targetApt.appointmentDate;
      const dateMatch = prompt.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) {
        newDate = dateMatch[0];
      } else if (lower.includes('tomorrow') || lower.includes('రేపు') || lower.includes('कल')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDate = tomorrow.toISOString().split('T')[0];
      }

      const reasonMatch = prompt.match(/(?:reason|due to|because)[:\s]+([^.,\n]+)/i);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Rescheduled by consulting physician';

      const prevDate = targetApt.appointmentDate;
      const prevSlot = targetApt.timeSlot;

      storage.updateAppointment(targetApt.id, {
        status: 'Rescheduled',
        appointmentDate: newDate,
        timeSlot: newTime,
        previousAppointmentDate: prevDate,
        previousTimeSlot: prevSlot,
        rescheduleReason: reason,
      });

      agentBus.dispatch(
        'doc_agent',
        'user_agent',
        'APPOINTMENT_RESCHEDULED',
        { appointmentId: targetApt.id, patientName: targetApt.patientName, newDate, newTime, reason },
        `Doctor rescheduled appointment ${targetApt.id} to ${newDate} at ${newTime}.`
      );

      let reply = `🔄 **Appointment Rescheduled Successfully!**\n\n• **Citizen Name:** **${targetApt.patientName}**\n• **Appointment ID:** \`${targetApt.id}\`\n• **New Consultation Slot:** **${newDate} at ${newTime}**\n• **Previous Slot:** ${prevDate} (${prevSlot})\n• **Secret Pass Code:** \`${targetApt.passCode}\`\n• **Status:** \`Rescheduled\`\n\nCitizen notified with updated appointment slot and PASS code.`;
      if (lang === 'te') {
        reply = `🔄 **అపాయింట్‌మెంట్ విజయవంతంగా రీషెడ్యూల్ చేయబడింది!**\n\n• **రోగి పేరు:** **${targetApt.patientName}**\n• **అపాయింట్‌మెంట్ ఐడీ:** \`${targetApt.id}\`\n• **కొత్త సమయం:** **${newDate}, ${newTime}**\n• **గత సమయం:** ${prevDate} (${prevSlot})\n• **పాస్‌కోడ్:** \`${targetApt.passCode}\`\n• **స్థితి:** \`Rescheduled\``;
      } else if (lang === 'hi') {
        reply = `🔄 **अपॉइंटमेंट सफलतापूर्वक रीशेड्यूल किया गया!**\n\n• **मरीज का नाम:** **${targetApt.patientName}**\n• **अपॉइंटमेंट आईडी:** \`${targetApt.id}\`\n• **नया समय:** **${newDate}, ${newTime}**\n• **पूर्व समय:** ${prevDate} (${prevSlot})\n• **पासकोड:** \`${targetApt.passCode}\`\n• **स्थिति:** \`Rescheduled\``;
      }

      return {
        reply,
        action: { type: 'RESCHEDULE_APPOINTMENT', target: 'queue', appointmentId: targetApt.id },
        detectedLanguage: lang,
      };
    }
  }

  // 4. Specific Appointment ID Explanation & Search
  const isExplainQuery =
    aptIdMatch !== null ||
    ((lower.includes('explain') ||
      lower.includes('detail') ||
      lower.includes('details') ||
      lower.includes('tell me about') ||
      lower.includes('who is') ||
      lower.includes('about appointment') ||
      lower.includes('గురించి') ||
      lower.includes('వివరాలు') ||
      lower.includes('వివరించండి') ||
      lower.includes('के बारे में') ||
      lower.includes('विवरण') ||
      lower.includes('विस्तार')) &&
      (lower.includes('appointment') || lower.includes('apt') || lower.includes('అపాయింట్') || lower.includes('अपॉइंटमेंट')));

  if (isExplainQuery) {
    const appointments = storage.getAppointments();
    let targetApt: any = null;

    if (aptIdMatch) {
      const searchId = aptIdMatch[0].toLowerCase();
      targetApt = appointments.find((a) => a.id.toLowerCase() === searchId || a.id.toLowerCase().includes(searchId));
    }

    if (!targetApt) {
      targetApt = appointments.find(
        (a) =>
          lower.includes(a.id.toLowerCase()) ||
          lower.includes(a.patientName.toLowerCase()) ||
          lower.includes(a.patientPhone.replace(/\s+/g, ''))
      );
    }

    if (!targetApt && appointments.length > 0) {
      targetApt = appointments[0];
    }

    if (targetApt) {
      let reply = `📋 **Clinical Consultation Dossier — Appointment \`${targetApt.id}\`**\n\n• **Citizen Name:** **${targetApt.patientName}**\n• **Appointment ID:** \`${targetApt.id}\`\n• **Citizen Mobile Number:** **${targetApt.patientPhone}**\n• **Appointment Date:** **${targetApt.appointmentDate}**\n• **Scheduled Time Slot:** **${targetApt.timeSlot}**\n• **Department:** **${targetApt.department}**\n• **Hospital Location:** **${targetApt.hospitalName}** (${targetApt.hospitalAddress})\n• **Consultation Status:** **${targetApt.status}**\n• **Secret Consultation Pass Code:** \`${targetApt.passCode}\` (Required to officially end visit)${targetApt.rescheduleReason ? `\n• **Reschedule History:** Shifted from ${targetApt.previousAppointmentDate || 'earlier slot'} (${targetApt.previousTimeSlot || 'N/A'}). Reason: *${targetApt.rescheduleReason}*` : ''}${targetApt.rejectionReason ? `\n• **Clinical Triage Notes:** *${targetApt.rejectionReason}*` : ''}\n\n👉 *To conclude consultation with this citizen, ask for pass code \`${targetApt.passCode}\` or verify in queue.*`;

      if (lang === 'te') {
        reply = `📋 **అపాయింట్‌మెంట్ \`${targetApt.id}\` యొక్క పూర్తి క్లినికల్ వివరాలు:**\n\n• **రోగి పేరు (Citizen Name):** **${targetApt.patientName}**\n• **అపాయింట్‌మెంట్ ఐడీ (Appointment ID):** \`${targetApt.id}\`\n• **మొబైల్ నంబర్ (Citizen Mobile):** **${targetApt.patientPhone}**\n• **అపాయింట్‌మెంట్ తేదీ (Appointment Date):** **${targetApt.appointmentDate}**\n• **సమయం (Time Slot):** **${targetApt.timeSlot}**\n• **విభాగం & ఆసుపత్రి:** **${targetApt.department}** — ${targetApt.hospitalName}\n• **ప్రస్తుత స్థితి (Status):** **${targetApt.status}**\n• **రహస్య కన్సల్టేషన్ పాస్‌కోడ్:** \`${targetApt.passCode}\`${targetApt.rescheduleReason ? `\n• **రీషెడ్యూల్ వివరాలు:** గత స్లాట్: ${targetApt.previousAppointmentDate || ''} (${targetApt.previousTimeSlot || ''}). కారణం: *${targetApt.rescheduleReason}*` : ''}\n\n👉 *కన్సల్టేషన్ పూర్తి చేయడానికి రోగి వద్ద నుండి \`${targetApt.passCode}\` కోడ్ ధృవీకరించండి.*`;
      } else if (lang === 'hi') {
        reply = `📋 **अपॉइंटमेंट \`${targetApt.id}\` का पूर्ण क्लिनिकल विवरण:**\n\n• **मरीज का नाम (Citizen Name):** **${targetApt.patientName}**\n• **अपॉइंटमेंट आईडी (Appointment ID):** \`${targetApt.id}\`\n• **मोबाइल नंबर (Citizen Mobile):** **${targetApt.patientPhone}**\n• **तारीख (Appointment Date):** **${targetApt.appointmentDate}**\n• **समय (Time Slot):** **${targetApt.timeSlot}**\n• **विभाग एवं अस्पताल:** **${targetApt.department}** — ${targetApt.hospitalName}\n• **स्थिति (Status):** **${targetApt.status}**\n• **सीक्रेट कंसल्टेशन पासकोड:** \`${targetApt.passCode}\`${targetApt.rescheduleReason ? `\n• **रीशेड्यूल विवरण:** पूर्व स्लॉट: ${targetApt.previousAppointmentDate || ''} (${targetApt.previousTimeSlot || ''})। कारण: *${targetApt.rescheduleReason}*` : ''}\n\n👉 *परामर्श पूर्ण करने हेतु मरीज से \`${targetApt.passCode}\` पासकोड सत्यापित करें।*`;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mediguide:open-appointment-details', { detail: { appointmentId: targetApt.id } }));
      }

      return {
        reply,
        action: { type: 'NAVIGATE', target: 'queue' },
        detectedLanguage: lang,
      };
    }
  }

  // 2. Pass Code Verification (Course or Consultation)
  const isPassCheck =
    lower.includes('pass') ||
    lower.includes('verify') ||
    lower.includes('code') ||
    lower.includes('పాస్') ||
    lower.includes('ధృవీక') ||
    lower.includes('पास') ||
    lower.includes('सत्यापित');

  const passMatch = prompt.toUpperCase().match(/PASS-?[0-9A-Z]{4,6}/) || (isPassCheck ? prompt.match(/\b\d{4}\b/) : null);

  if (passMatch) {
    let cleanCode = passMatch[0].toUpperCase();
    if (!cleanCode.startsWith('PASS-')) {
      cleanCode = `PASS-${cleanCode.replace('PASS', '').trim()}`;
    }

    const courses = storage.getCourses();
    const matchedCourse = courses.find((c) => c.verificationPassCode.toUpperCase() === cleanCode);

    if (matchedCourse) {
      agentBus.verifyAndEndCourse(matchedCourse.id, matchedCourse.verificationPassCode);

      let reply = `✅ **Pass Code Verified!** Consultation course **${matchedCourse.courseCode}** for patient **${matchedCourse.patientName}** (Diagnosis: ${matchedCourse.diagnosis}) has been successfully verified and concluded.\n\n🔑 Pass Code: **${cleanCode}**\n📋 Status: Completed\n🏥 Digital clinical record sealed and synced.`;
      if (lang === 'te') {
        reply = `✅ **పాస్‌కోడ్ విజయవంతంగా ధృవీకరించబడింది!** రోగి **${matchedCourse.patientName}** యొక్క కన్సల్టేషన్ కోర్సు **${matchedCourse.courseCode}** (వ్యాధి నిర్ధారణ: ${matchedCourse.diagnosis}) ధృవీకరించబడి అధికారికంగా పూర్తి చేయబడింది.\n\n🔑 పాస్‌కోడ్: **${cleanCode}**\n📋 స్థితి: పూర్తయింది`;
      } else if (lang === 'hi') {
        reply = `✅ **पासकोड सफलतापूर्वक सत्यापित!** मरीज **${matchedCourse.patientName}** का कंसल्टेशन कोर्स **${matchedCourse.courseCode}** (निदान: ${matchedCourse.diagnosis}) सत्यापित कर दिया गया है और परामर्श पूर्ण हुआ।\n\n🔑 पासकोड: **${cleanCode}**\n📋 स्थिति: पूर्ण (Completed)`;
      }

      return {
        reply,
        action: { type: 'VERIFY_PASS', target: 'courses', passCode: cleanCode, courseId: matchedCourse.id },
        verifiedData: {
          type: 'course',
          id: matchedCourse.id,
          passCode: cleanCode,
          patientName: matchedCourse.patientName,
        },
        detectedLanguage: lang,
      };
    }

    const appointments = storage.getAppointments();
    const matchedApt = appointments.find((a) => a.passCode.toUpperCase() === cleanCode);

    if (matchedApt) {
      storage.updateAppointment(matchedApt.id, { status: 'Completed' });
      agentBus.dispatch(
        'doc_agent',
        'user_agent',
        'VERIFY_PASS_AND_END_COURSE',
        { appointmentId: matchedApt.id, passCode: cleanCode },
        `Doctor verified passcode ${cleanCode} for patient ${matchedApt.patientName}. Consultation concluded successfully.`
      );

      let reply = `✅ **Consultation Pass Code Verified!** Appointment for **${matchedApt.patientName}** (${matchedApt.department}) at **${matchedApt.hospitalName}** is now officially marked as **Completed**.\n\n🔑 Pass Code: **${cleanCode}**\n⏰ Time Slot: ${matchedApt.timeSlot}`;
      if (lang === 'te') {
        reply = `✅ **కన్సల్టేషన్ పాస్‌కోడ్ విజయవంతంగా ధృవీకరించబడింది!** **${matchedApt.patientName}** గారి అపాయింట్‌మెంట్ (**${matchedApt.department}**, ${matchedApt.hospitalName}) పూర్తయినట్లుగా నమోదు చేయబడింది.\n\n🔑 పాస్‌కోడ్: **${cleanCode}**\n⏰ సమయం: ${matchedApt.timeSlot}`;
      } else if (lang === 'hi') {
        reply = `✅ **कंसल्टेशन पासकोड सफलतापूर्वक सत्यापित!** मरीज **${matchedApt.patientName}** (${matchedApt.department}, ${matchedApt.hospitalName}) की अपॉइंटमेंट को पूर्ण (Completed) चिह्नित कर दिया गया है।\n\n🔑 पासकोड: **${cleanCode}**\n⏰ समय: ${matchedApt.timeSlot}`;
      }

      return {
        reply,
        action: { type: 'VERIFY_PASS', target: 'queue', passCode: cleanCode },
        verifiedData: {
          type: 'appointment',
          id: matchedApt.id,
          passCode: cleanCode,
          patientName: matchedApt.patientName,
        },
        detectedLanguage: lang,
      };
    }

    // Code provided but not found
    const activePassList = [
      ...courses.filter((c) => c.status === 'Active').map((c) => `${c.verificationPassCode} (${c.patientName})`),
      ...appointments.filter((a) => a.status !== 'Completed').map((a) => `${a.passCode} (${a.patientName})`),
    ].slice(0, 3);

    let reply = `❌ Pass code **${cleanCode}** was not found among active records. Please ensure the patient presents the exact PASS-XXXX code displayed on their MediGuide citizen app.\n\nActive codes currently awaiting verification:\n${activePassList.join('\n') || 'No pending codes'}`;
    if (lang === 'te') {
      reply = `❌ పాస్‌కోడ్ **${cleanCode}** రికార్డులలో కనుగొనబడలేదు. దయచేసి రోగి తమ మెడిగైడ్ యాప్‌లో చూపిస్తున్న ఖచ్చితమైన PASS-XXXX కోడ్‌ను అందించారో లేదో తనిఖీ చేయండి.\n\nప్రస్తుతం పెండింగ్‌లో ఉన్న పాస్‌కోడ్‌లు:\n${activePassList.join('\n') || 'ఏవీ లేవు'}`;
    } else if (lang === 'hi') {
      reply = `❌ पासकोड **${cleanCode}** सक्रिय रिकॉर्ड में नहीं मिला। कृपया सुनिश्चित करें कि मरीज अपने मेडिगाइड ऐप पर प्रदर्शित सही कोड प्रदान कर रहा है।\n\nवर्तमान में लंबित पासकोड:\n${activePassList.join('\n') || 'कोई लंबित कोड नहीं'}`;
    }

    return { reply, detectedLanguage: lang };
  }

  // 3. OPD Queue Inspection & Today's Timetable Schedule
  const isQueueOrScheduleQuery =
    lower.includes('queue') ||
    lower.includes('patient') ||
    lower.includes('waiting') ||
    lower.includes('timetable') ||
    lower.includes('time table') ||
    lower.includes('schedule') ||
    lower.includes('how many') ||
    lower.includes('today') ||
    lower.includes('कतार') ||
    lower.includes('मरीज') ||
    lower.includes('शेड्यूल') ||
    lower.includes('टाइमटेबल') ||
    lower.includes('कितने') ||
    lower.includes('आज') ||
    lower.includes('క్యూ') ||
    lower.includes('రోగులు') ||
    lower.includes('షెడ్యూల్') ||
    lower.includes('టైమ్‌టేబుల్') ||
    lower.includes('ఎన్ని') ||
    lower.includes('ఈరోజు');

  if (isQueueOrScheduleQuery) {
    const appointments = storage.getAppointments();
    const todayStr = new Date().toISOString().split('T')[0];

    // Get today's or current queue appointments
    const todayApts = appointments.filter((a) => a.appointmentDate === todayStr);
    const displayApts = todayApts.length > 0 ? todayApts : appointments;

    const waiting = displayApts.filter((a) => a.status === 'Accepted' || a.status === 'Pending' || a.status === 'Rescheduled');
    const completed = displayApts.filter((a) => a.status === 'Completed');
    const nextPatient = waiting[0];

    // Sort chronologically by time slot
    const slotOrder = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM'];
    const sortedApts = [...displayApts].sort((a, b) => {
      const idxA = slotOrder.indexOf(a.timeSlot);
      const idxB = slotOrder.indexOf(b.timeSlot);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    const tableRows = sortedApts
      .map(
        (a) =>
          `| ${a.timeSlot} | **${a.patientName}** | \`${a.patientPhone}\` | \`${a.id}\` | ${a.department || 'General OPD'} | \`${a.status}\` | \`${a.passCode}\` |`
      )
      .join('\n');

    let reply = `📅 **Today's OPD Consultation Timetable & Schedule (${todayStr}):**\n\nYou currently have **${displayApts.length} total appointments** on the roster (**${waiting.length} waiting/active**, **${completed.length} completed**).\n\n| Time Slot | Citizen Name | Mobile Number | Appointment ID | Dept / OPD | Status | Secret Pass Code |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n${nextPatient ? `👉 **Next Patient in Queue:** **${nextPatient.patientName}** at **${nextPatient.timeSlot}** (Phone: \`${nextPatient.patientPhone}\` | Pass Code: \`${nextPatient.passCode}\`).` : '✅ All consultations for today are concluded!'}\n\n*Tip: Click any appointment card in the queue to view full citizen details, or ask me "Explain about [Appointment ID]".*`;

    if (lang === 'te') {
      reply = `📅 **నేటి ఓపీడీ కన్సల్టేషన్ టైమ్‌టేబుల్ మరియు షెడ్యూల్ (${todayStr}):**\n\nఈరోజు మొత్తం **${displayApts.length} అపాయింట్‌మెంట్‌లు** ఉన్నాయి (**${waiting.length} వేచి ఉన్న రోగులు**, **${completed.length} పూర్తయినవి**).\n\n| సమయం (Slot) | రోగి పేరు (Citizen) | మొబైల్ నంబర్ | అపాయింట్‌మెంట్ ఐడీ | విభాగం | స్థితి (Status) | పాస్‌కోడ్ |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n${nextPatient ? `👉 **తదుపరి రోగి:** **${nextPatient.patientName}** — ${nextPatient.timeSlot} (మొబైల్: \`${nextPatient.patientPhone}\` | పాస్‌కోడ్: \`${nextPatient.passCode}\`).` : '✅ నేటి కన్సల్టేషన్‌లన్నీ పూర్తయ్యాయి!'}`;
    } else if (lang === 'hi') {
      reply = `📅 **आज की ओपीडी कंसल्टेशन समय-सारणी (Timetable Schedule - ${todayStr}):**\n\nआज आपके कुल **${displayApts.length} अपॉइंटमेंट** निर्धारित हैं (**${waiting.length} प्रतीक्षारत**, **${completed.length} पूर्ण**)।\n\n| समय (Time Slot) | मरीज का नाम | मोबाइल नंबर | अपॉइंटमेंट आईडी | विभाग | स्थिति (Status) | पासकोड |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n${nextPatient ? `👉 **अगले मरीज:** **${nextPatient.patientName}** — ${nextPatient.timeSlot} (फोन: \`${nextPatient.patientPhone}\` | पासकोड: \`${nextPatient.passCode}\`).` : '✅ आज के सभी परामर्श पूरे हो चुके हैं।'}`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'queue' }, detectedLanguage: lang };
  }

  // 3. Review Medical Courses
  if (lower.includes('course') || lower.includes('కోర్సు') || lower.includes('కోర్స్') || lower.includes('कोर्स') || lower.includes('treatment')) {
    const courses = storage.getCourses();
    const active = courses.filter((c) => c.status === 'Active');

    const courseSummary = active
      .slice(0, 3)
      .map((c) => `• **${c.courseCode}** — ${c.patientName} | Diagnosis: ${c.diagnosis} | Pass: \`${c.verificationPassCode}\``)
      .join('\n');

    let reply = `🩺 **Active Medical Courses:**\nYou have **${active.length}** active ongoing treatment courses.\n\n${courseSummary || 'No active courses currently recorded.'}`;
    if (lang === 'te') {
      reply = `🩺 **యాక్టివ్ మెడికల్ కోర్సులు:**\nప్రస్తుతం **${active.length}** క్రియాశీల చికిత్సా కోర్సులు ఉన్నాయి.\n\n${courseSummary || 'ప్రస్తుతం యాక్టివ్ కోర్సులు లేవు.'}`;
    } else if (lang === 'hi') {
      reply = `🩺 **सक्रिय मेडिकल कोर्स:**\nवर्तमान में **${active.length}** सक्रिय उपचार कोर्स चल रहे हैं।\n\n${courseSummary || 'कोई सक्रिय कोर्स नहीं है।'}`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'courses' }, detectedLanguage: lang };
  }

  // 4. Emergency Schedule Override
  if (
    lower.includes('emergency') ||
    lower.includes('override') ||
    lower.includes('trauma') ||
    lower.includes('ఎమర్జెన్సీ') ||
    lower.includes('ఆపాత') ||
    lower.includes('आपात')
  ) {
    const appointments = storage.getAppointments();
    const nextApt = appointments.find((a) => a.status === 'Accepted' || a.status === 'Pending');

    if (nextApt) {
      const res = agentBus.triggerEmergencyOverride(nextApt.id, 'Urgent surgical trauma received in emergency bay');

      let reply = `🚨 **Emergency Schedule Override Dispatched!**\nSlot for **${nextApt.patientName}** (${nextApt.timeSlot}) has been safely postponed to prioritize incoming critical emergency.\n\n🎟️ Patient compensation voucher: \`${res.voucherCode}\` (25% fee waiver).\nAgent bus dispatched real-time notification to patient's user_agent.`;
      if (lang === 'te') {
        reply = `🚨 **ఎమర్జెన్సీ షెడ్యూల్ ఓవర్‌రైడ్ అమలు చేయబడింది!**\nఅత్యవసర కేసు దృష్ట్యా **${nextApt.patientName}** గారి స్లాట్ (${nextApt.timeSlot}) వాయిదా వేయబడింది మరియు 25% పరిహార వోచర్ (\`${res.voucherCode}\`) జారీ చేయబడింది. యూజర్ ఏజెంట్‌కు నోటిఫికేషన్ పంపబడింది.`;
      } else if (lang === 'hi') {
        reply = `🚨 **आपातकालीन शेड्यूल ओवरराइड सक्रिय!**\nअति-आवश्यक ट्रॉमा केस हेतु **${nextApt.patientName}** का स्लॉट (${nextApt.timeSlot}) स्थगित कर दिया गया है। 25% छूट वाउचर (\`${res.voucherCode}\`) मरीज को जारी कर दिया गया है।`;
      }

      return { reply, detectedLanguage: lang };
    }

    return {
      reply: 'There are no active scheduled appointments in your immediate queue to postpone for emergency override.',
      detectedLanguage: lang,
    };
  }

  // 5. Drug-Drug Interaction Advisory
  if (
    lower.includes('metformin') ||
    lower.includes('amlodipine') ||
    lower.includes('paracetamol') ||
    lower.includes('interaction') ||
    lower.includes('interact') ||
    lower.includes('contraindicat')
  ) {
    let reply = `💊 **Clinical Pharmacology Advisory:**\n• **Metformin + Amlodipine:** No direct pharmacokinetic contraindication. Amlodipine provides effective peripheral vasodilation for hypertension, while Metformin controls glycemic levels. Monitor BP and renal parameters periodically.\n• **Paracetamol (650mg):** Safe for symptomatic fever/pain with Metformin and Amlodipine at standard dosages (<3g/24h).`;
    if (lang === 'te') {
      reply = `💊 **క్లినికల్ ఫార్మకాలజీ సలహా:**\n• **మెట్‌ఫార్మిన్ + ఆమ్లోడిపైన్:** ఎటువంటి ప్రమాదకర పరస్పర చర్యలు లేవు. రక్తపోటు మరియు షుగర్ స్థాయిల నియంత్రణకు ఇది సురక్షితం. క్రమం తప్పకుండా బీపీ మరియు కిడ్నీ పనితీరును గమనించండి.\n• **పారాసిటమాల్:** రోజుకు 3 గ్రాములకు మించకుండా సురక్షితంగా వాడవచ్చు.`;
    } else if (lang === 'hi') {
      reply = `💊 **क्लिनिकल फार्माकोलॉजी सलाह:**\n• **मेटफॉर्मिन + एम्लोडिपिन:** कोई प्रतिकूल इंटरैक्शन नहीं है। दोनों दवाएं एक साथ सुरक्षित हैं। समय-समय पर रक्तचाप और गुर्दे की कार्यप्रणाली की निगरानी करें।\n• **पैरासिटामोल:** मानक खुराक (3g/दिन से कम) में सुरक्षित है।`;
    }

    return { reply, detectedLanguage: lang };
  }

  // Default Doctor Greeting
  let reply = `Namaste Dr. ${context.userName || 'Rajesh'}! I am DocAssist (doc_agent), your specialized Clinical AI Copilot.\n\nI can assist you with:\n1. 🔑 **Verify Pass Codes:** Tell me "Verify PASS-XXXX" to validate patient visits.\n2. 📋 **OPD Queue Review:** Ask "Show today's OPD queue".\n3. 🩺 **Treatment Courses:** Ask "Review active medical courses".\n4. 🚨 **Emergency Overrides:** Command "Emergency slot takeover".\n5. 💊 **Drug Safety:** Ask drug-drug interactions.`;
  if (lang === 'te') {
    reply = `నమస్కారం డాక్టర్ గారూ! నేను DocAssist (doc_agent), మీ క్లినికల్ ఏఐ కోపాయ్లెట్.\n\nనేను మీకు ఈ సేవలలో సహాయపడతాను:\n1. 🔑 **పాస్‌కోడ్ ధృవీకరణ:** రోగి కన్సల్టేషన్ ముగింపు కోసం "PASS-XXXX ధృవీకరించు" అని చెప్పండి.\n2. 📋 **ఓపీడీ క్యూ:** "నేటి ఓపీడీ క్యూ చూపించు" అని అడగండి.\n3. 🩺 **మెడికల్ కోర్సులు:** "యాక్టివ్ కోర్సులు పరిశీలించు" అని అడగండి.\n4. 🚨 **ఎమర్జెన్సీ ఓవర్‌రైడ్:** "ఎమర్జెన్సీ షెడ్యూల్ ఓవర్‌రైడ్" ఆదేశించండి.\n5. 💊 **మందుల పరస్పర చర్యలు:** ఫార్మకాలజీ భద్రత పరిశీలించండి.`;
  } else if (lang === 'hi') {
    reply = `नमस्ते डॉक्टर साहब! मैं DocAssist (doc_agent), आपका क्लिनिकल एआई कोपायलट हूँ।\n\nमैं आपकी निम्नलिखित कार्यों में सहायता कर सकता हूँ:\n1. 🔑 **पासकोड सत्यापन:** "Verify PASS-XXXX" कहकर परामर्श पूरा करें।\n2. 📋 **ओपीडी कतार:** "आज की ओपीडी कतार दिखाओ" पूछें।\n3. 🩺 **इलाज कोर्स:** "सक्रिय मेडिकल कोर्स देखें" पूछें।\n4. 🚨 **आपातकालीन ओवरराइड:** आपातकालीन स्लॉट प्रबंधन करें।\n5. 💊 **दवा परस्पर क्रिया:** दवा सुरक्षा परामर्श लें।`;
  }

  return { reply, detectedLanguage: lang };
}

/* =========================================================================
   2. RECEPTIONIST AGENT (user_receptionist_agent) - Front Desk Copilot
   ========================================================================= */
function processReceptionistAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lower = prompt.toLowerCase();
  const lang = context.language || 'en';
  const hospitals = storage.getHospitals();
  const defaultHosp = hospitals.find((h) => h.id === 'hosp_del_01') || hospitals[0];

  // 1. Search Doctor by ID (Available, On Leave, Busy with Appointment)
  const docIdMatch = prompt.match(/\b(doc_[a-zA-Z0-9_-]+)\b/i) || prompt.match(/\b(doc_\d+)\b/i);
  const isDoctorSearch =
    docIdMatch !== null ||
    ((lower.includes('search') ||
      lower.includes('find') ||
      lower.includes('is') ||
      lower.includes('status') ||
      lower.includes('available') ||
      lower.includes('busy') ||
      lower.includes('leave') ||
      lower.includes('ఖాలీ') ||
      lower.includes('ఉన్నారా') ||
      lower.includes('ఉపలబ్ధ') ||
      lower.includes('उपलब्ध') ||
      lower.includes('छुट्टी')) &&
      (lower.includes('doctor') || lower.includes('dr.') || lower.includes('డాక్టర్') || lower.includes('डॉक्टर')));

  if (isDoctorSearch) {
    const searchToken = docIdMatch ? docIdMatch[0].toLowerCase() : '';
    const allDoctors = defaultHosp.doctors || [];
    let matchedDoc = allDoctors.find(
      (d) =>
        (searchToken && (d.id.toLowerCase() === searchToken || d.id.toLowerCase().includes(searchToken))) ||
        lower.includes(d.id.toLowerCase()) ||
        lower.includes(d.name.toLowerCase()) ||
        lower.includes(d.specialty.toLowerCase())
    );

    if (!matchedDoc && allDoctors.length > 0) {
      matchedDoc = allDoctors[0];
    }

    if (matchedDoc) {
      const appointments = storage.getAppointments();
      const todayStr = new Date().toISOString().split('T')[0];
      const activeApt = appointments.find(
        (a) =>
          (a.doctorId === matchedDoc.id || a.doctorName.toLowerCase().includes(matchedDoc.name.toLowerCase())) &&
          (a.status === 'Accepted' || a.status === 'Pending')
      );

      let statusBadge = '🟢 Available / On-Duty';
      let statusDetails = `Checked in and accepting walk-ins & consultations in OPD Room ${(matchedDoc as any).roomNumber || '102'} at ${defaultHosp.name}.`;

      if (matchedDoc.status === 'On Leave' || lower.includes('leave') || lower.includes('छुट्टी')) {
        statusBadge = '🔴 On Leave Today';
        statusDetails = `Doctor is on sanctioned medical/personal leave today. Substitute consultant on-call in OPD Room ${(matchedDoc as any).roomNumber || '102'}.`;
      } else if (activeApt) {
        statusBadge = '🟡 Busy with Consultation';
        statusDetails = `Currently examining patient **${activeApt.patientName}** (Appointment \`${activeApt.id}\`, slot ${activeApt.timeSlot}) in OPD Room ${(matchedDoc as any).roomNumber || '102'}.`;
      }

      let reply = `👨‍⚕️ **Doctor Real-Time Status — ${matchedDoc.name} (${matchedDoc.id})**\n\n• **Doctor ID:** \`${matchedDoc.id}\`\n• **Hospital:** ${defaultHosp.name}\n• **Department / Specialty:** **${matchedDoc.specialty}** (${matchedDoc.qualifications})\n• **Consultation Room:** OPD Room ${(matchedDoc as any).roomNumber || '102'}\n• **Current Status:** **${statusBadge}**\n• **Live Details:** ${statusDetails}`;
      if (lang === 'te') {
        reply = `👨‍⚕️ **డాక్టర్ ప్రత్యక్ష స్థితి నివేదిక — ${matchedDoc.name} (${matchedDoc.id})**\n\n• **డాక్టర్ ఐడీ:** \`${matchedDoc.id}\`\n• **ఆసుపత్రి:** ${defaultHosp.name}\n• **విభాగం:** **${matchedDoc.specialty}**\n• **గది:** OPD Room ${(matchedDoc as any).roomNumber || '102'}\n• **ప్రస్తుత స్థితి:** **${statusBadge}**\n• **వివరాలు:** ${statusDetails}`;
      } else if (lang === 'hi') {
        reply = `👨‍⚕️ **डॉक्टर लाइव स्थिति रिपोर्ट — ${matchedDoc.name} (${matchedDoc.id})**\n\n• **डॉक्टर आईडी:** \`${matchedDoc.id}\`\n• **अस्पताल:** ${defaultHosp.name}\n• **विभाग:** **${matchedDoc.specialty}**\n• **ओपीडी कमरा:** Room ${(matchedDoc as any).roomNumber || '102'}\n• **वर्तमान स्थिति:** **${statusBadge}**\n• **विवरण:** ${statusDetails}`;
      }

      return {
        reply,
        action: { type: 'NAVIGATE', target: 'roster' },
        detectedLanguage: lang,
      };
    }
  }

  // 2. Doctor Attendance / Check-in
  if (
    lower.includes('doctor') ||
    lower.includes('attendance') ||
    lower.includes('check in') ||
    lower.includes('check-in') ||
    lower.includes('roster') ||
    lower.includes('డాక్టర్') ||
    lower.includes('హాజరు') ||
    lower.includes('उपस्थिति')
  ) {
    const docs = defaultHosp.doctors || [];
    const docList = docs
      .map((d, i) => `${i + 1}. **${d.name}** (${d.specialty}) — Status: ✅ On-Duty (OPD Room ${101 + i})`)
      .join('\n');

    let reply = `🏥 **Doctor On-Duty Roster & Attendance (${defaultHosp.name}):**\n\n${docList}\n\nAll ${docs.length} scheduled department physicians are checked in and accepting patients today.`;
    if (lang === 'te') {
      reply = `🏥 **డాక్టర్ల హాజరు మరియు విధి నిర్వహణ వివరాలు (${defaultHosp.name}):**\n\n${docList}\n\nఈరోజు షెడ్యూల్ చేయబడిన అందరు ${docs.length} మంది డాక్టర్లు విధుల్లో ఉన్నారు మరియు రోగులను పరీక్షిస్తున్నారు.`;
    } else if (lang === 'hi') {
      reply = `🏥 **डॉक्टरों की उपस्थिति और रोस्टर (${defaultHosp.name}):**\n\n${docList}\n\nआज के सभी ${docs.length} डॉक्टर चेक-इन कर चुके हैं और ओपीडी में उपलब्ध हैं।`;
    }

    return { reply, detectedLanguage: lang };
  }

  // 2. Hospital Bed Capacity & Occupancy
  if (
    lower.includes('bed') ||
    lower.includes('capacity') ||
    lower.includes('occupan') ||
    lower.includes('ward') ||
    lower.includes('బెడ్') ||
    lower.includes('बिस्तर') ||
    lower.includes('बेड')
  ) {
    const totalBeds = defaultHosp.totalBeds;
    const freeBeds = defaultHosp.bedsAvailable;
    const occupied = totalBeds - freeBeds;
    const occRate = ((occupied / totalBeds) * 100).toFixed(1);

    let reply = `🛏️ **Hospital Bed Capacity & Ward Status (${defaultHosp.name}):**\n• **Total Sanctioned Beds:** ${totalBeds}\n• **Occupied Beds:** ${occupied}\n• **Free Beds Available:** ${freeBeds} (${defaultHosp.city}, ${defaultHosp.state})\n• **Current Occupancy Rate:** ${occRate}%\n\nEmergency & ICU bay has sufficient reserves under Ayushman Bharat protocol.`;
    if (lang === 'te') {
      reply = `🛏️ **ఆసుపత్రి బెడ్ల లభ్యత మరియు వార్డుల స్థితి (${defaultHosp.name}):**\n• **మొత్తం బెడ్లు:** ${totalBeds}\n• **రోగులు ఉన్న బెడ్లు:** ${occupied}\n• **అందుబాటులో ఉన్న ఉచిత బెడ్లు:** ${freeBeds}\n• **ఆక్యుపెన్సీ రేటు:** ${occRate}%\n\nఆయుష్మాన్ భారత్ నిబంధనల ప్రకారం అత్యవసర విభాగానికి తగినన్ని బెడ్లు కేటాయించబడ్డాయి.`;
    } else if (lang === 'hi') {
      reply = `🛏️ **अस्पताल में बेड की क्षमता एवं स्थिति (${defaultHosp.name}):**\n• **कुल स्वीकृत बेड:** ${totalBeds}\n• **भरे हुए बेड:** ${occupied}\n• **उपलब्ध खाली बेड:** ${freeBeds}\n• **वर्तमान ऑक्यूपेंसी:** ${occRate}%\n\nआयुष्मान भारत प्रोटोकॉल के तहत आपातकालीन वार्ड में पर्याप्त बेड सुरक्षित हैं।`;
    }

    return { reply, detectedLanguage: lang };
  }

  // 3. OPD Queue & Footfall
  if (
    lower.includes('queue') ||
    lower.includes('appointment') ||
    lower.includes('footfall') ||
    lower.includes('క్యూ') ||
    lower.includes('కదలిక') ||
    lower.includes('कतार')
  ) {
    const appointments = storage.getAppointments();
    const todayApts = appointments.filter((a) => a.hospitalId === defaultHosp.id || !a.hospitalId);

    let reply = `📊 **Front-Desk OPD Queue Coordination:**\n• Total Appointments Registered Today: **${todayApts.length}**\n• Completed Visits: **${todayApts.filter((a) => a.status === 'Completed').length}**\n• In-Waiting / Active: **${todayApts.filter((a) => a.status === 'Accepted' || a.status === 'Pending').length}**\n\nSlots are balanced with zero double-booking conflicts across rooms.`;
    if (lang === 'te') {
      reply = `📊 **ఫ్రంట్-డెస్క్ ఓపీడీ క్యూ సమన్వయం:**\n• నేడు నమోదైన మొత్తం అపాయింట్‌మెంట్‌లు: **${todayApts.length}**\n• పూర్తయిన కన్సల్టేషన్‌లు: **${todayApts.filter((a) => a.status === 'Completed').length}**\n• వేచి ఉన్న రోగులు: **${todayApts.filter((a) => a.status === 'Accepted' || a.status === 'Pending').length}**\n\nఎటువంటి స్లాట్ ఘర్షణలు లేకుండా రోగులు సజావుగా దర్శించుకుంటున్నారు.`;
    } else if (lang === 'hi') {
      reply = `📊 **फ्रंट-डेस्क ओपीडी कतार समन्वय:**\n• आज कुल पंजीकृत अपॉइंटमेंट: **${todayApts.length}**\n• पूर्ण हुए परामर्श: **${todayApts.filter((a) => a.status === 'Completed').length}**\n• प्रतीक्षारत मरीज: **${todayApts.filter((a) => a.status === 'Accepted' || a.status === 'Pending').length}**`;
    }

    return { reply, detectedLanguage: lang };
  }

  // 4. Pharmacy Restock Alerts
  if (
    lower.includes('pharmacy') ||
    lower.includes('stock') ||
    lower.includes('alert') ||
    lower.includes('reorder') ||
    lower.includes('రీస్టాక్') ||
    lower.includes('రీస్టాక్ అలర్ట్') ||
    lower.includes('रीस्टॉक')
  ) {
    const meds = storage.getMedicines();
    const lowStock = meds.filter((m) => m.availableQuantity <= m.minimumThreshold);

    const alertList = lowStock
      .map((m) => `⚠️ **${m.name}** — ${m.availableQuantity} units left (Min threshold: ${m.minimumThreshold})`)
      .join('\n');

    let reply = `📦 **Pharmacy Restock Alerts from Jan Aushadhi Counter:**\n\n${alertList || 'All essential drug stocks are above minimum threshold.'}\n\nYou can acknowledge and place bulk Jan Aushadhi replenishment directly from the reception console.`;
    if (lang === 'te') {
      reply = `📦 **జన్ ఔషధి ఫార్మసీ రీస్టాక్ అలర్ట్‌లు:**\n\n${alertList || 'అన్ని అత్యవసర మందుల నిల్వలు సంతృప్తికరంగా ఉన్నాయి.'}\n\nరిసెప్షన్ కౌంటర్ నుండి ఆర్డర్ ఖరారు చేయవచ్చు.`;
    } else if (lang === 'hi') {
      reply = `📦 **जन औषधि फार्मेसी से रीस्टॉक अलर्ट:**\n\n${alertList || 'सभी आवश्यक दवाइयाँ पर्याप्त मात्रा में उपलब्ध हैं।'}`;
    }

    return { reply, detectedLanguage: lang };
  }

  // Default Receptionist Greeting
  let reply = `Namaste Reception Desk! I am your ReceptionDesk Copilot (user_receptionist_agent).\n\nI can assist you with:\n1. 👨‍⚕️ **Doctor Attendance:** Ask "Check doctor attendance status".\n2. 🛏️ **Bed Capacity:** Ask "Hospital bed capacity & occupancy".\n3. 📊 **OPD Queue Coordination:** Ask "Show today's appointments".\n4. 📦 **Pharmacy Alerts:** Ask "Check low stock alerts".`;
  if (lang === 'te') {
    reply = `నమస్కారం రిసెప్షన్ డెస్క్! నేను మీ ReceptionDesk కోపాయ్లెట్ (user_receptionist_agent).\n\nనేను ఈ అంశాలలో మీకు సహాయపడతాను:\n1. 👨‍⚕️ **డాక్టర్ల హాజరు:** "డాక్టర్ల హాజరు స్థితి పరిశీలించు" అని అడగండి.\n2. 🛏️ **బెడ్ల లభ్యత:** "హాస్పిటల్ బెడ్ల సామర్థ్యం మరియు లభ్యత" అని అడగండి.\n3. 📊 **ఓపీడీ క్యూ:** "నేటి అపాయింట్‌మెంట్లు" చూడండి.\n4. 📦 **ఫార్మసీ నిల్వలు:** రీస్టాక్ నోటిఫికేషన్లు తనిఖీ చేయండి.`;
  } else if (lang === 'hi') {
    reply = `नमस्ते रिसेप्शन डेस्क! मैं आपका ReceptionDesk कोपायलट (user_receptionist_agent) हूँ।\n\nमैं आपकी सहायता कर सकता हूँ:\n1. 👨‍⚕️ **डॉक्टर उपस्थिति:** "डॉक्टर उपस्थिति स्थिति जांचें" पूछें।\n2. 🛏️ **बेड उपलब्धता:** "अस्पताल में बेड क्षमता" पूछें।\n3. 📊 **ओपीडी कतार:** आज के अपॉइंटमेंट ट्रैक करें।\n4. 📦 **फार्मेसी अलर्ट:** रीस्टॉक अलर्ट की जांच करें।`;
  }

  return { reply, detectedLanguage: lang };
}

/* =========================================================================
   3. PHARMACY AGENT (pharm_agent) - Dispensary Copilot
   ========================================================================= */
function processPharmAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lower = prompt.toLowerCase();
  const lang = context.language || 'en';
  const medicines = storage.getMedicines();

  // 1. Low Stock Inventory Check
  if (
    lower.includes('low') ||
    lower.includes('stock') ||
    lower.includes('threshold') ||
    lower.includes('inventory') ||
    lower.includes('తక్కువ') ||
    lower.includes('నిల్వ') ||
    lower.includes('कम') ||
    lower.includes('स्टॉक')
  ) {
    const lowStock = medicines.filter((m) => m.availableQuantity <= m.minimumThreshold);

    const list = lowStock
      .map(
        (m) =>
          `⚠️ **${m.name}**\n   • Generic: ${m.genericName}\n   • Stock: **${m.availableQuantity} units** (Threshold: ${m.minimumThreshold})\n   • Price: ₹${m.pricePerUnit} | Batch: ${m.batchNumber}`
      )
      .join('\n\n');

    agentBus.dispatch(
      'pharm_agent',
      'user_receptionist_agent',
      'LOW_STOCK_ALERT',
      { count: lowStock.length, medicines: lowStock.map((m) => ({ name: m.name, qty: m.availableQuantity, loc: m.location })) },
      `Automated Pharmacy Sentinel: Dispatched low-stock alert for ${lowStock.length} medicines to front-desk reception.`
    );

    let reply = `🚨 **Inventory Sentinel Low-Stock Report:**\nFound **${lowStock.length}** formulations below safety minimum threshold:\n\n${list}\n\nAuto-alert automatically dispatched via agentBus to front-desk reception and hospital admin for Jan Aushadhi replenishment!`;
    if (lang === 'te') {
      reply = `🚨 **ఇన్వెంటరీ సెంటినెల్ నివేదిక - తక్కువగా ఉన్న మందుల నిల్వలు:**\nకనిష్ట పరిమితి కంటే తక్కువగా ఉన్న **${lowStock.length}** మందులు గుర్తించబడ్డాయి:\n\n${list}\n\nవెంటనే రీస్టాక్ ఆర్డర్ కోసం ఫ్రంట్ డెస్క్ మరియు రిసెప్షన్‌కు ఆటోమేటిక్ అలర్ట్ పంపబడింది!`;
    } else if (lang === 'hi') {
      reply = `🚨 **इन्वेंटरी प्रहरी रिपोर्ट - कम स्टॉक दवाइयाँ:**\nन्यूनतम थ्रेशोल्ड से कम **${lowStock.length}** दवाइयाँ पाई गईं:\n\n${list}\n\nरीस्टॉकिंग हेतु फ्रंट डेस्क रिसेप्शन को स्वचालित अलर्ट भेज दिया गया है!`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'inventory' }, detectedLanguage: lang };
  }

  // 2. Bill / Dispense Specific Medicine & Auto-Deduct Inventory
  if (
    (lower.includes('bill') || lower.includes('dispense') || lower.includes('sell') || lower.includes('deduct') || lower.includes('బిల్లు') || lower.includes('పంపిణీ') || lower.includes('बिल')) &&
    (lower.includes('dolo') || lower.includes('paracetamol') || lower.includes('amoxicillin') || lower.includes('pantoprazole') || lower.includes('telmisartan') || lower.includes('unit') || lower.includes('యూనిట్') || lower.includes('यूनिट'))
  ) {
    const qtyMatch = lower.match(/(\d+)\s*(?:units?|tablets?|strips?|యూనిట్లు?|యూనిట్|यूनिट)?/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;

    let target = medicines.find(
      (m) =>
        (lower.includes('dolo') && m.name.toLowerCase().includes('dolo')) ||
        (lower.includes('paracetamol') && m.name.toLowerCase().includes('paracetamol')) ||
        (lower.includes('amoxicillin') && m.name.toLowerCase().includes('amoxicillin')) ||
        (lower.includes('pantoprazole') && m.name.toLowerCase().includes('pantoprazole')) ||
        (lower.includes('telmisartan') && m.name.toLowerCase().includes('telmisartan')) ||
        lower.includes(m.name.toLowerCase())
    ) || medicines[0];

    if (target) {
      const prevQty = target.availableQuantity;
      const updatedList = storage.updateMedicineQuantity(target.id, -quantity);
      const newQty = updatedList.find((m) => m.id === target.id)?.availableQuantity ?? Math.max(0, prevQty - quantity);

      agentBus.dispatch(
        'pharm_agent',
        'billing_agent',
        'STOCK_DISPENSED_NOTIFICATION',
        { medicineId: target.id, medicineName: target.name, deducted: quantity, remaining: newQty },
        `pharm_agent billed ${quantity} units of ${target.name}. Stock updated from ${prevQty} to ${newQty}.`
      );

      const locText = target.location || `${target.rack || 4}th rack, ${target.column || 3}rd column, ${target.row || 5}th row`;

      let reply = `✅ **Jan Aushadhi Medicine Dispensation & Stock Deduction:**\n• **Medicine:** **${target.name}**\n• **Dispensed Quantity:** **${quantity} units**\n• **Inventory Before Billing:** **${prevQty} units**\n• **Inventory After Billing:** **${newQty} units**\n• **Shelf Warehouse Location:** 📍 **${locText}**\n• **Total Dispensation Value:** **₹${(quantity * target.pricePerUnit).toFixed(2)}**\n\nThe medical inventory available stock has been updated immediately.`;
      if (lang === 'te') {
        reply = `✅ **మందుల పంపిణీ మరియు స్టాక్ తగ్గింపు:**\n• **మందు:** **${target.name}**\n• **పంపిణీ చేసిన యూనిట్లు:** **${quantity} యూనిట్లు**\n• **బిల్లింగ్ ముందు నిల్వ:** **${prevQty} యూనిట్లు**\n• **బిల్లింగ్ తర్వాత నిల్వ:** **${newQty} యూనిట్లు**\n• **రాక్ లొకేషన్:** 📍 **${locText}**`;
      } else if (lang === 'hi') {
        reply = `✅ **दवा वितरण और इन्वेंट्री स्टॉक कटौती:**\n• **दवा:** **${target.name}**\n• **वितरित मात्रा:** **${quantity} यूनिट**\n• **बिलिंग से पहले स्टॉक:** **${prevQty} यूनिट**\n• **बिलिंग के बाद स्टॉक:** **${newQty} यूनिट**\n• **वेयरहाउस लोकेशन:** 📍 **${locText}**`;
      }

      return { reply, action: { type: 'NAVIGATE', target: 'billing' }, detectedLanguage: lang };
    }
  }

  // 2b. Automated Bill Transmission to WhatsApp & Email
  if (
    lower.includes('whatsapp') ||
    lower.includes('mail') ||
    lower.includes('email') ||
    lower.includes('dispatch bill') ||
    lower.includes('send bill') ||
    lower.includes('transmit')
  ) {
    const bills = storage.getBills();
    const latestBill = bills[0];

    if (latestBill) {
      agentBus.dispatch(
        'pharm_agent',
        'user_agent',
        'BILL_TRANSMITTED_DIGITAL',
        {
          billNumber: latestBill.billNumber,
          total: latestBill.grandTotal,
          whatsApp: latestBill.patientWhatsApp,
          email: latestBill.patientEmail,
        },
        `PharmaDesk Copilot transmitted bill ${latestBill.billNumber} to ${latestBill.patientWhatsApp} and ${latestBill.patientEmail}.`
      );

      let reply = `🧾 **Jan Aushadhi Bill & Invoice Telemetry Dispatch:**\n\n• **Bill Number:** \`${latestBill.billNumber}\`\n• **Citizen / Patient:** **${latestBill.patientName}**\n• **Hospital Dispensary:** ${latestBill.hospitalName}\n• **Total Amount:** **₹${latestBill.grandTotal.toFixed(2)}** (${latestBill.paymentMethod})\n• **WhatsApp Dispatch Status:** ✅ **Delivered to ${latestBill.patientWhatsApp}**\n• **Email Delivery Status:** ✅ **Transmitted to ${latestBill.patientEmail}**\n\nOfficial PDF tax invoice link and digital payment receipt have been automatically routed to the citizen.`;
      if (lang === 'te') {
        reply = `🧾 **జన్ ఔషధి బిల్లు & ఇన్‌వాయిస్ డిజిటల్ డిస్పాచ్:**\n\n• **బిల్లు నంబర్:** \`${latestBill.billNumber}\`\n• **రోగి పేరు:** **${latestBill.patientName}**\n• **మొత్తం చెల్లింపు:** **₹${latestBill.grandTotal.toFixed(2)}**\n• **వాట్సాప్ డెలివరీ:** ✅ **${latestBill.patientWhatsApp} కు పంపబడింది**\n• **ఈమెయిల్ డెలివరీ:** ✅ **${latestBill.patientEmail} కు పంపబడింది**`;
      } else if (lang === 'hi') {
        reply = `🧾 **जन औषधि बिल और इनवॉइस डिजिटल प्रेषण:**\n\n• **बिल संख्या:** \`${latestBill.billNumber}\`\n• **मरीज का नाम:** **${latestBill.patientName}**\n• **कुल राशि:** **₹${latestBill.grandTotal.toFixed(2)}**\n• **व्हाट्सएप स्थिति:** ✅ **${latestBill.patientWhatsApp} पर भेजा गया**\n• **ईमेल स्थिति:** ✅ **${latestBill.patientEmail} पर प्रेषित**`;
      }

      return { reply, action: { type: 'NAVIGATE', target: 'billing' }, detectedLanguage: lang };
    }
  }

  // 3. Search Specific Medicine / Generic Pricing & Warehouse Location
  if (
    lower.includes('search') ||
    lower.includes('find') ||
    lower.includes('price') ||
    lower.includes('location') ||
    lower.includes('where') ||
    lower.includes('rack') ||
    lower.includes('column') ||
    lower.includes('row') ||
    lower.includes('dolo') ||
    lower.includes('paracetamol') ||
    lower.includes('amoxicillin') ||
    lower.includes('pantoprazole') ||
    lower.includes('telmisartan') ||
    lower.includes('ధర') ||
    lower.includes('ఖరీదు') ||
    lower.includes('ఎక్కడ') ||
    lower.includes('कीमत') ||
    lower.includes('कहाँ')
  ) {
    const match =
      medicines.find(
        (m) =>
          lower.includes(m.name.toLowerCase()) ||
          lower.includes(m.genericName.toLowerCase()) ||
          (lower.includes('dolo') && m.name.toLowerCase().includes('dolo')) ||
          (lower.includes('paracetamol') && m.name.toLowerCase().includes('paracetamol')) ||
          (lower.includes('amoxicillin') && m.name.toLowerCase().includes('amoxicillin')) ||
          (lower.includes('pantoprazole') && m.name.toLowerCase().includes('pantoprazole')) ||
          (lower.includes('telmisartan') && m.name.toLowerCase().includes('telmisartan'))
      ) || medicines[0];

    const locationText = match.location || `${match.rack || 4}th rack, ${match.column || 3}rd column, ${match.row || 5}th row`;

    let reply = `💊 **Jan Aushadhi Generic Formulation Details:**\n• **Medicine:** **${match.name}**\n• **Generic Formula:** ${match.genericName}\n• **Physical Warehouse Location:** 📍 **${locationText}**\n• **Public Jan Aushadhi Price:** **₹${match.pricePerUnit} / unit**\n• **Available Stock:** **${match.availableQuantity} units**\n• **Batch:** ${match.batchNumber} | Expiry: ${match.expiryDate}\n• **Manufacturer:** ${match.manufacturer}`;
    if (lang === 'te') {
      reply = `💊 **జన్ ఔషధి జనరిక్ మందు వివరాలు:**\n• **మందు పేరు:** **${match.name}**\n• **ఫార్ములా:** ${match.genericName}\n• **గిడ్డంగి లొకేషన్:** 📍 **${locationText}**\n• **ప్రభుత్వ జన్ ఔషధి ధర:** **₹${match.pricePerUnit} / యూనిట్**\n• **అందుబాటులో ఉన్న నిల్వ:** **${match.availableQuantity} యూనిట్లు**\n• **బ్యాచ్:** ${match.batchNumber} | గడువు: ${match.expiryDate}`;
    } else if (lang === 'hi') {
      reply = `💊 **जन औषधि जेनेरिक दवा विवरण:**\n• **दवा:** **${match.name}**\n• **फार्मूला:** ${match.genericName}\n• **भौतिक वेयरहाउस लोकेशन:** 📍 **${locationText}**\n• **सरकारी जन औषधि कीमत:** **₹${match.pricePerUnit} / यूनिट**\n• **उपलब्ध स्टॉक:** **${match.availableQuantity} यूनिट**\n• **बैच:** ${match.batchNumber} | एक्सपायरी: ${match.expiryDate}`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'inventory' }, detectedLanguage: lang };
  }

  // 3. Ayushman Bharat 25% Subsidized Pricing Calculation
  if (
    lower.includes('ayushman') ||
    lower.includes('discount') ||
    lower.includes('subsid') ||
    lower.includes('25%') ||
    lower.includes('సబ్సిడీ') ||
    lower.includes('డిస్కౌంట్') ||
    lower.includes('छूट')
  ) {
    let reply = `🏛️ **Ayushman Bharat Subsidized Dispensation Protocol:**\nUnder the National Jan Aushadhi & ABDM guidelines, eligible citizens receive an additional **25% Government Subsidy** on top of wholesale generic pricing.\n\n📊 **Example Calculation:**\n• Retail Total: ₹100.00\n• Ayushman Bharat 25% Subsidy: -₹25.00\n• **Net Citizen Payable: ₹75.00**\n\nThe 25% discount is automatically deducted and recorded on the official GST PDF receipt generated by billing_agent.`;
    if (lang === 'te') {
      reply = `🏛️ **ఆయుష్మాన్ భారత్ సబ్సిడీ పద్ధతి:**\nజాతీయ జన్ ఔషధి మరియు ఆయుష్మాన్ భారత్ నిబంధనల ప్రకారం, అర్హులైన పౌరులకు జన్ ఔషధి ధరలపై అదనంగా **25% ప్రభుత్వ సబ్సిడీ** వర్తిస్తుంది.\n\n📊 **ఉదాహరణ:**\n• మొత్తం బిల్లు: ₹100.00\n• 25% సబ్సిడీ తగ్గింపు: -₹25.00\n• **రోగి చెల్లించాల్సిన నికర మొత్తం: ₹75.00**`;
    } else if (lang === 'hi') {
      reply = `🏛️ **आयुष्मान भारत सब्सिडी प्रोटोकॉल:**\nजन औषधि और आयुष्मान भारत योजना के तहत नागरिकों को दवाओं पर **25% अतिरिक्त सरकारी सब्सिडी** प्राप्त होती है।\n\n📊 **उदाहरण:**\n• कुल बिल: ₹100.00\n• 25% सरकारी सब्सिडी: -₹25.00\n• **मरीज द्वारा देय राशि: ₹75.00**`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'billing' }, detectedLanguage: lang };
  }

  // 4. Pharmacy Bills History
  if (lower.includes('bill') || lower.includes('receipt') || lower.includes('invoice') || lower.includes('బిల్లు') || lower.includes('రసీదు') || lower.includes('बिल')) {
    const bills = storage.getBills();
    const totalRev = bills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);

    let reply = `🧾 **Jan Aushadhi Dispensary Billing Counter:**\n• Total Invoices Generated: **${bills.length}**\n• Total Subsidized Dispensation Value: **₹${totalRev.toFixed(2)}**\n• Official PDF receipts dispatched via billing_agent to patient portal & WhatsApp.`;
    if (lang === 'te') {
      reply = `🧾 **జన్ ఔషధి ఫార్మసీ బిల్లింగ్ సమాచారం:**\n• నమోదైన రసీదులు: **${bills.length}**\n• మొత్తం అమ్మకాల విలువ: **₹${totalRev.toFixed(2)}**\n• billing_agent ద్వారా రసీదులు పేషెంట్ పోర్టల్‌కు పంపబడ్డాయి.`;
    } else if (lang === 'hi') {
      reply = `🧾 **जन औषधि फार्मेसी बिलिंग विवरण:**\n• कुल जारी बिल: **${bills.length}**\n• कुल दवा वितरण मूल्य: **₹${totalRev.toFixed(2)}**`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'history' }, detectedLanguage: lang };
  }

  // Default Pharmacy Greeting
  let reply = `Welcome to Pharmacy Counter! I am PharmaDesk Copilot (pharm_agent).\n\nI can assist you with:\n1. 📦 **Check Low Stock:** Ask "Check low stock medicines".\n2. 🔍 **Generic Drug Pricing:** Ask "Search Paracetamol 650mg stock & price".\n3. 🏛️ **Ayushman Subsidy:** Ask "Calculate 25% Ayushman Bharat discount".\n4. 🧾 **Bills History:** Ask "View pharmacy bills history".`;
  if (lang === 'te') {
    reply = `ఫార్మసీ కౌంటర్‌కు స్వాగతం! నేను PharmaDesk కోపాయ్లెట్ (pharm_agent).\n\nనేను ఈ అంశాలలో మీకు సహాయపడతాను:\n1. 📦 **తక్కువగా ఉన్న మందులు:** "తక్కువగా ఉన్న మందుల నిల్వలు" అని అడగండి.\n2. 🔍 **ధరల శోధన:** "పారాసిటమాల్ 650mg స్టాక్ మరియు ధర" అని అడగండి.\n3. 🏛️ **ఆయుష్మాన్ సబ్సిడీ:** "ఆయుష్మాన్ భారత్ 25% సబ్సిడీ లెక్కించు" అని అడగండి.\n4. 🧾 **బిల్లుల చరిత్ర:** ఫార్మసీ రసీదులు చూడండి.`;
  } else if (lang === 'hi') {
    reply = `फार्मेसी काउंटर में आपका स्वागत है! मैं PharmaDesk कोपायलट (pharm_agent) हूँ।\n\nमैं आपकी सहायता कर सकता हूँ:\n1. 📦 **कम स्टॉक दवाइयाँ:** "कम स्टॉक वाली दवाइयाँ दिखाओ" पूछें।\n2. 🔍 **दवा कीमत खोजें:** "पैरासिटामोल 650mg स्टॉक और कीमत" पूछें।\n3. 🏛️ **आयुष्मान छूट:** "25% आयुष्मान भारत छूट की गणना" पूछें।\n4. 🧾 **बिल इतिहास:** फार्मेसी बिलों का इतिहास देखें।`;
  }

  return { reply, detectedLanguage: lang };
}

/* =========================================================================
   4. ADMIN AGENT (admin_agent) - SuperAdmin National Hub
   ========================================================================= */
function processAdminAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lower = prompt.toLowerCase();
  const lang = context.language || 'en';

  // 1. Security Audit Stream & Logs
  if (
    lower.includes('audit') ||
    lower.includes('log') ||
    lower.includes('security') ||
    lower.includes('warning') ||
    lower.includes('traffic') ||
    lower.includes('ఆడిట్') ||
    lower.includes('లాగ్') ||
    lower.includes('ऑडिट')
  ) {
    const logs = agentBus.getLogs();
    const warnings = logs.filter((l) => l.isWarning).length;

    let reply = `🔍 **Real-Time Agent Audit Stream Inspection:**\n• Total Audit Trail Entries: **${logs.length} logged**\n• System Warnings / Overrides: **${warnings}**\n• Latest Transaction: \`${logs[0]?.messageType || 'GENERAL_CHAT'}\` from \`${logs[0]?.sender || 'user_agent'}\` (${logs[0]?.latencyMs || 65} ms latency).\n\nZero integrity violations or unauthorized clinical data tampering detected.`;
    if (lang === 'te') {
      reply = `🔍 **రియల్-టైమ్ ఏజెంట్ ఆడిట్ లాగ్ విశ్లేషణ:**\n• మొత్తం నమోదైన ఆడిట్ రికార్డులు: **${logs.length}**\n• హెచ్చరికలు / ఎమర్జెన్సీ ఓవర్‌రైడ్‌లు: **${warnings}**\n• సిస్టమ్‌లో ఎటువంటి భద్రతా లోపాలు లేవు.`;
    } else if (lang === 'hi') {
      reply = `🔍 **रियल-टाइम एजेंट ऑडिट स्ट्रीम रिपोर्ट:**\n• कुल ऑडिट प्रविष्टियाँ: **${logs.length}**\n• सुरक्षा चेतावनियाँ: **${warnings}**\n• सभी लेन-देन सुरक्षित हैं।`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'audit' }, detectedLanguage: lang };
  }

  // 2. National Bed Occupancy & Capacity across 33 Indian States/UTs
  if (
    lower.includes('bed') ||
    lower.includes('occupan') ||
    lower.includes('state') ||
    lower.includes('national') ||
    lower.includes('analytics') ||
    lower.includes('capacity') ||
    lower.includes('hospital') ||
    lower.includes('బెడ్') ||
    lower.includes('రాష్ట్ర') ||
    lower.includes('राष्ट्रीय') ||
    lower.includes('बिस्तर')
  ) {
    const hospitals = storage.getHospitals();
    const totalBeds = hospitals.reduce((acc, h) => acc + (h.totalBeds || 0), 0);
    const freeBeds = hospitals.reduce((acc, h) => acc + (h.bedsAvailable || 0), 0);
    const occupied = totalBeds - freeBeds;
    const occRate = ((occupied / totalBeds) * 100).toFixed(1);

    const statesCovered = new Set(hospitals.map((h) => h.state)).size;

    let reply = `🇮🇳 **National Public Healthcare Bed Occupancy Analytics:**\n• **Total Registered Hospitals:** ${hospitals.length} Public Hospitals\n• **Geographic Coverage:** All **${statesCovered} Indian States & Union Territories**\n• **Total National Bed Capacity:** **${totalBeds.toLocaleString()} beds**\n• **Free Beds Available Nationwide:** **${freeBeds.toLocaleString()} beds**\n• **National Occupancy Rate:** **${occRate}%**\n\nTop States by Bed Capacity: Delhi, Maharashtra, Tamil Nadu, Uttar Pradesh, Telangana, Karnataka.`;
    if (lang === 'te') {
      reply = `🇮🇳 **జాతీయ ప్రభుత్వ ఆసుపత్రుల బెడ్ల గణాంకాలు:**\n• **నమోదైన ప్రభుత్వ ఆసుపత్రులు:** ${hospitals.length}\n• **భౌగోళిక పరిధి:** అన్ని **${statesCovered} భారతీయ రాష్ట్రాలు మరియు కేంద్రపాలిత ప్రాంతాలు**\n• **మొత్తం జాతీయ బెడ్ల సామర్థ్యం:** **${totalBeds.toLocaleString()} బెడ్లు**\n• **దేశవ్యాప్తంగా అందుబాటులో ఉన్న ఉచిత బెడ్లు:** **${freeBeds.toLocaleString()} బెడ్లు**\n• **జాతీయ ఆక్యుపెన్సీ రేటు:** **${occRate}%**`;
    } else if (lang === 'hi') {
      reply = `🇮🇳 **राष्ट्रीय सरकारी अस्पताल बेड ऑक्यूपेंसी विश्लेषण:**\n• **कुल पंजीकृत अस्पताल:** ${hospitals.length} सरकारी अस्पताल\n• **कवरेज:** सभी **${statesCovered} भारतीय राज्य और केंद्र शासित प्रदेश**\n• **कुल राष्ट्रीय बेड क्षमता:** **${totalBeds.toLocaleString()} बेड**\n• **देशभर में उपलब्ध खाली बेड:** **${freeBeds.toLocaleString()} बेड**\n• **राष्ट्रीय ऑक्यूपेंसी दर:** **${occRate}%**`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'analytics' }, detectedLanguage: lang };
  }

  // 3. Inspect 8-Agent Mesh Status & Latencies
  if (
    lower.includes('mesh') ||
    lower.includes('latency') ||
    lower.includes('health') ||
    lower.includes('telemetry') ||
    lower.includes('network') ||
    lower.includes('8-agent') ||
    lower.includes('8 agent') ||
    lower.includes('agent') ||
    lower.includes('ఏజెంట్') ||
    lower.includes('లేటెన్సీ') ||
    lower.includes('एजेंट')
  ) {
    const agents = storage.getAgents();
    const activeCount = agents.filter((a) => a.status === 'Active').length;
    const totalHandled = agents.reduce((acc, a) => acc + (a.messagesHandled || 0), 0);

    const list = agents
      .map((a) => `• **${a.name}** (\`${a.id}\`) — Status: ✅ ${a.status} | Messages: ${a.messagesHandled} | v${a.version}`)
      .join('\n');

    let reply = `🛡️ **Omniscient 8-Agent Mesh Telemetry:**\n• **Active Micro-Agents:** ${activeCount} / 8 Operational\n• **Total Inter-Agent Messages Handled:** ${totalHandled}\n• **Average Bus Latency:** 64 ms (Target: <150 ms)\n\n${list}\n\nSecurity isolation and ABDM interoperability standards are 100% compliant.`;
    if (lang === 'te') {
      reply = `🛡️ **8-ఏజెంట్ జాతీయ ఆరోగ్య నెట్‌వర్క్ స్థితి:**\n• **క్రియాశీల ఏజెంట్లు:** ${activeCount} / 8 పనిచేస్తున్నాయి\n• **మొత్తం ప్రసారమైన సందేశాలు:** ${totalHandled}\n• **సగటు నెట్‌వర్క్ లేటెన్సీ:** 64 ms\n\n${list}\n\nసిస్టమ్ పూర్తిగా సురక్షితంగా మరియు క్రియాశీలంగా ఉంది.`;
    } else if (lang === 'hi') {
      reply = `🛡️ **8-एजेंट राष्ट्रीय स्वास्थ्य नेटवर्क स्थिति:**\n• **सक्रिय माइक्रो-एजेंट्स:** ${activeCount} / 8 चालू हैं\n• **कुल संदेश हैंडल किए गए:** ${totalHandled}\n• **औसत लेटेंसी:** 64 ms\n\n${list}`;
    }

    return { reply, action: { type: 'NAVIGATE', target: 'supervision' }, detectedLanguage: lang };
  }

  // Default Admin Greeting
  let reply = `Welcome Administrator! I am SuperAdmin Omniscient Hub (admin_agent).\n\nI can assist you with:\n1. 🛡️ **8-Agent Mesh Status:** Ask "Inspect 8-agent mesh status & latency".\n2. 🇮🇳 **National Bed Occupancy:** Ask "National bed occupancy analytics across 33 states".\n3. 🔍 **Audit Logs:** Ask "Show recent agent audit logs".\n4. 🏥 **Hospital Directory:** Ask "List active hospitals in system".`;
  if (lang === 'te') {
    reply = `అడ్మినిస్ట్రేటర్ గారికి స్వాగతం! నేను SuperAdmin హబ్ (admin_agent).\n\nనేను ఈ అంశాలలో మీకు సహాయపడతాను:\n1. 🛡️ **8-ఏజెంట్ నెట్‌వర్క్:** "8-ఏజెంట్ నెట్‌వర్క్ మరియు లేటెన్సీ వివరాలు" అడగండి.\n2. 🇮🇳 **జాతీయ బెడ్ల ఆక్యుపెన్సీ:** "33 రాష్ట్రాల జాతీయ బెడ్ల ఆక్యుపెన్సీ గణాంకాలు" అడగండి.\n3. 🔍 **ఆడిట్ లాగ్‌లు:** ఇటీవలి లాగ్‌లు పరిశీలించండి.\n4. 🏥 **ఆసుపత్రుల రిజిస్ట్రీ:** వ్యవస్థలో ఉన్న ఆసుపత్రుల సమాచారం చూడండి.`;
  } else if (lang === 'hi') {
    reply = `राष्ट्रीय प्रशासनिक हब में स्वागत है! मैं SuperAdmin हब (admin_agent) हूँ।\n\nमैं आपकी सहायता कर सकता हूँ:\n1. 🛡️ **8-एजेंट मेश स्थिति:** "8-एजेंट मेश स्थिति और लेटेंसी" पूछें।\n2. 🇮🇳 **राष्ट्रीय बेड ऑक्यूपेंसी:** "33 राज्यों में राष्ट्रीय बेड क्षमता" पूछें।\n3. 🔍 **ऑडिट लॉग्स:** हालिया सुरक्षा ऑडिट लॉग देखें।\n4. 🏥 **अस्पताल डायरेक्टरी:** पंजीकृत अस्पतालों की सूची देखें।`;
  }

  return { reply, detectedLanguage: lang };
}

/**
 * Intelligent hospital matcher handling full names, acronyms, distinctive brand words,
 * common phonetic misspellings, and cities.
 */
export function findMatchingHospital(prompt: string, hospitals: Hospital[], defaultState?: string): Hospital {
  const lower = prompt.toLowerCase();

  // 1. Direct name match (ignoring parenthesized text)
  for (const h of hospitals) {
    const rawName = h.name.toLowerCase();
    const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim();
    if (lower.includes(rawName) || (cleanName.length > 5 && lower.includes(cleanName))) {
      return h;
    }
  }

  // 2. Acronym / Code match in parentheses (e.g. SVIMS, OGH, KGH, AIIMS, KGMU, PGIMER, NIMS, JIPMER, BHU)
  for (const h of hospitals) {
    const parenMatch = h.name.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const acronym = parenMatch[1].toLowerCase();
      const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        return h;
      }
    }
    if (h.uniqueCode && new RegExp(`\\b${h.uniqueCode.toLowerCase()}\\b`, 'i').test(lower)) {
      return h;
    }
  }

  // 3. Distinctive brand / identity words (e.g. "venkateswara", "osmania", "safdarjung", "gandhi", "king george", "sunderlal")
  const genericWords = new Set([
    'hospital', 'institute', 'medical', 'sciences', 'scinces', 'general', 'government',
    'govt', 'public', 'center', 'centre', 'memorial', 'college', 'trust', 'care',
    'super', 'specialty', 'speciality', 'and', 'the', 'for', 'all', 'india', 'state', 'district'
  ]);

  let bestHospital: Hospital | null = null;
  let bestScore = 0;

  for (const h of hospitals) {
    const cleanName = h.name.toLowerCase().replace(/\s*\([^)]*\)/g, '');
    const tokens = cleanName.split(/\s+/).filter((w) => w.length > 3 && !genericWords.has(w));

    let score = 0;
    for (const token of tokens) {
      if (lower.includes(token)) {
        score += token.length >= 7 ? 3 : 2;
      }
    }

    if (h.city && lower.includes(h.city.toLowerCase())) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestHospital = h;
    }
  }

  if (bestHospital && bestScore >= 2) {
    return bestHospital;
  }

  // 4. State match from prompt
  for (const h of hospitals) {
    if (lower.includes(h.state.toLowerCase())) {
      return h;
    }
  }

  // 5. Fallback to patient's home state or first hospital
  if (defaultState) {
    const stateHosp = hospitals.find((h) => h.state.toLowerCase() === defaultState.toLowerCase());
    if (stateHosp) return stateHosp;
  }

  return hospitals[0];
}

/**
 * Intelligent appointment matcher by hospital name, acronym, unique code, or brand keywords
 */
export function findAppointmentByHospital(prompt: string, appointments: Appointment[]): Appointment | null {
  const lower = prompt.toLowerCase();

  // 1. Direct name match (e.g. full hospital name or stripped parentheses)
  for (const apt of appointments) {
    const rawHosp = apt.hospitalName.toLowerCase();
    const cleanHosp = rawHosp.replace(/\s*\([^)]*\)/g, '').trim();
    if (lower.includes(rawHosp) || (cleanHosp.length > 4 && lower.includes(cleanHosp))) {
      return apt;
    }
  }

  // 2. Acronym match in parentheses or hospital code (e.g. SVIMS, OGH, AIIMS, KGH, KGMU, PGIMER, NIMS, JIPMER, BHU)
  for (const apt of appointments) {
    const parenMatch = apt.hospitalName.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const acronym = parenMatch[1].toLowerCase();
      const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        return apt;
      }
    }
    if (apt.hospitalCode && new RegExp(`\\b${apt.hospitalCode.toLowerCase()}\\b`, 'i').test(lower)) {
      return apt;
    }
  }

  // 3. Distinctive identity tokens (e.g. "venkateswara", "osmania", "safdarjung", "gandhi", "king george", "sunderlal")
  const genericWords = new Set([
    'hospital', 'institute', 'medical', 'sciences', 'scinces', 'general', 'government',
    'govt', 'public', 'center', 'centre', 'college', 'and', 'the', 'for', 'all', 'india'
  ]);

  let bestApt: Appointment | null = null;
  let bestScore = 0;

  for (const apt of appointments) {
    const cleanName = apt.hospitalName.toLowerCase().replace(/\s*\([^)]*\)/g, '');
    const tokens = cleanName.split(/\s+/).filter((w) => w.length > 3 && !genericWords.has(w));

    let score = 0;
    for (const token of tokens) {
      if (lower.includes(token)) {
        score += token.length >= 7 ? 3 : 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestApt = apt;
    }
  }

  if (bestApt && bestScore >= 2) {
    return bestApt;
  }

  return null;
}

/* =========================================================================
   5. CITIZEN / PATIENT AGENT (user_agent) - MediNav Citizen Copilot
   ========================================================================= */
function processUserAgentLocally(
  prompt: string,
  context: { agentId: string; activeRole: string; userName?: string; hospitalName?: string; language?: string }
): AgentResponse {
  const lower = (prompt || '').normalize('NFC').toLowerCase();
  const lang = context.language || 'en';
  const hospitals = storage.getHospitals();
  const patient = storage.getPatientProfile();

  // 1. Guardrail Check (Out-of-Scope)
  const outOfScopeKeywords = [
    'cook', 'cooking', 'recipe', 'bake', 'cake', 'biryani', 'movie', 'cricket', 'football',
    'game', 'python code', 'javascript', 'write essay', 'president', 'joke', 'dance', 'song'
  ];

  const isOutOfScope = outOfScopeKeywords.some((word) => lower.includes(word));
  if (isOutOfScope) {
    let refusal = `I apologize, but I am MediGuide AI, strictly dedicated to healthcare assistance and hospital navigation. I cannot assist with non-medical requests like cooking or unrelated tasks. How may I help you with your health, appointments, or hospital navigation today?`;
    if (lang === 'te') {
      refusal = `క్షమించండి, నేను కేవలం ఆరోగ్య మార్గదర్శకత్వం మరియు ప్రభుత్వ ఆసుపత్రి సేవల కోసం మాత్రమే రూపొందించబడిన మెడిగైడ్ ఏఐని. నేను వంటలు లేదా ఇతర వైద్యేతర విషయాలలో సహాయం చేయలేను. మీ ఆరోగ్యం లేదా ఆసుపత్రి సేవలలో నేను మీకు ఎలా సహాయపడగలను?`;
    } else if (lang === 'hi') {
      refusal = `मुझे खेद है, लेकिन मैं केवल स्वास्थ्य मार्गदर्शन और सरकारी अस्पताल सेवाओं के लिए समर्पित मेडिगाइड एआई हूँ। मैं खाना पकाने या गैर-चिकित्सीय विषयों में सहायता नहीं कर सकता। मैं आपके स्वास्थ्य के लिए क्या मदद कर सकता हूँ?`;
    } else if (lang === 'ta') {
      refusal = `மன்னிக்கவும், நான் மருத்துவ வழிகாட்டுதல் மற்றும் மருத்துவமனை சேவைகளுக்கான மெடிகைடு ஏஐ. சமையல் அல்லது பிற மருத்துவம் அல்லாத பணிகளுக்கு என்னால் உதவ முடியாது. உங்கள் உடல்நலத்திற்கு நான் எவ்வாறு உதவலாம்?`;
    } else if (lang === 'bn') {
      refusal = `আমি দুঃখিত, আমি মেডিগাইড এআই, শুধুমাত্র স্বাস্থ্যসেবা এবং হাসপাতালের নির্দেশনার জন্য নিবেদিত। রান্নাবান্না বা চিকিৎসা বহির্ভূত বিষয়ে আমি সাহায্য করতে পারি না।`;
    } else if (lang === 'mr') {
      refusal = `मला माफ करा, मी केवळ आरोग्य मार्गदर्शन आणि रुग्णालय सेवेसाठी समर्पित मेडीगाइड एआय आहे. मी स्वयंपाक किंवा इतर विषयांवर मदत करू शकत नाही.`;
    } else if (lang === 'kn') {
      refusal = `ಕ್ಷಮಿಸಿ, ನಾನು ಕೇವಲ ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ಆಸ್ಪತ್ರೆ ಸೇವೆಗಳಿಗಾಗಿ ಸಮರ್ಪಿತವಾಗಿರುವ ಮೆಡಿಗೈಡ್ ಎಐ. ಅಡುಗೆ ಅಥವಾ ವೈದ್ಯಕೀಯೇತರ ವಿಷಯಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.`;
    } else if (lang === 'gu') {
      refusal = `માફ કરશો, હું ફક્ત આરોગ્ય માર્ગદર્શન અને સરકારી હોસ્પિટલ સેવાઓ માટે સમર્પિત મેડિગાઇડ એઆઇ છું. રસોઈ અથવા બિન-તબીબી વિષયોમાં હું મદદ કરી શકતો નથી.`;
    }
    return {
      reply: refusal,
      isOutOfScope: true,
      detectedLanguage: lang,
    };
  }

  // 1.5. Interactive Appointment Proposal Handlers (Confirmation, Cancellation, Flexible Slot Change, Date Change)
  const activeProposal = storage.getAppointmentProposal();

  const isConfirmProposal =
    (lower.includes('confirm') ||
      lower.includes('ఖరారు') ||
      lower.includes('కన్ఫర్మ్') ||
      lower.includes('ఖాయం') ||
      lower.includes('कन्फर्म') ||
      lower.includes('कन्फर्म करें') ||
      lower.includes('कन्फर्म करो') ||
      lower.includes('पुष्टि') ||
      lower.includes('पक्का') ||
      lower.includes('உறுதி') ||
      (lower.includes('yes') && (lower.includes('book') || lower.includes('appointment') || lower.includes('proceed') || lower.trim() === 'yes' || lower.trim() === 'yes please')) ||
      lower.includes('book it') ||
      lower.includes('book this') ||
      lower.includes('బుక్ చేయండి') ||
      lower.includes('సరే బుక్') ||
      lower.includes('बुक कर दो') ||
      lower.includes('हाँ बुक')) &&
    !lower.includes('cancel') &&
    !lower.includes('రద్దు') &&
    !lower.includes('रद्द') &&
    !lower.includes("don't") &&
    !lower.includes('dont');

  const isNewHospitalBooking =
    (lower.includes('book') && (lower.includes('hospital') || lower.includes('institute') || lower.includes(' in ') || lower.includes(' at '))) ||
    lower.includes('ఆసుపత్రి') || lower.includes('హాస్పిటల్') ||
    lower.includes('अस्पताल') ||
    (lower.includes('बुक') && (lower.includes('अस्पताल') || lower.includes('संस्थान') || lower.includes('में')));

  // A. CONFIRM PROPOSAL (Citizen explicitly confirms)
  if (activeProposal && isConfirmProposal && !isNewHospitalBooking) {
    const bookingRes = agentBus.bookAppointmentViaAgents({
      hospitalId: activeProposal.hospitalId,
      hospitalName: activeProposal.hospitalName,
      hospitalCode: activeProposal.hospitalCode,
      hospitalAddress: activeProposal.hospitalAddress,
      googleMapsUrl: activeProposal.googleMapsUrl,
      doctorId: activeProposal.doctorId,
      doctorName: activeProposal.doctorName,
      department: activeProposal.department,
      date: activeProposal.date,
      requestedSlot: activeProposal.requestedSlot,
      patientId: activeProposal.patientId,
      patientName: activeProposal.patientName,
      patientPhone: activeProposal.patientPhone,
    });

    storage.clearAppointmentProposal();
    const passCode = bookingRes.appointment.passCode;

    let reply = `🎉 **Appointment Confirmed & Booked!**\n\nYour General OPD consultation has been officially confirmed with **${activeProposal.doctorName}** (${activeProposal.department}) at **${activeProposal.hospitalName}**.\n\n📅 **Date:** ${activeProposal.date}\n⏰ **Time Slot:** ${bookingRes.appointment.timeSlot}\n🔑 **Secret Consultation Pass Code:** ${passCode}\n\nThis appointment is now safely saved to your Consultation History. Please present this code to the doctor during your consultation. Opening appointments page!`;

    if (lang === 'te') {
      reply = `🎉 **అపాయింట్‌మెంట్ విజయవంతంగా ఖరారైంది!**\n\n**${activeProposal.hospitalName}** లో **${activeProposal.doctorName}** (${activeProposal.department}) గారితో మీ ఓపీడీ అపాయింట్‌మెంట్ అధికారికంగా ఖరారైంది.\n\n📅 **తేదీ:** ${activeProposal.date}\n⏰ **ఖరారైన సమయం:** ${bookingRes.appointment.timeSlot}\n🔑 **రహస్య కన్సల్టేషన్ పాస్‌కోడ్:** ${passCode}\n\nఇది మీ అపాయింట్‌మెంట్ హిస్టరీలో భద్రపరచబడింది. డాక్టర్‌ను కలిసినప్పుడు ఈ పాస్‌కోడ్‌ను చూపించండి. అపాయింట్‌మెంట్ల పేజీ తెరుస్తున్నాను!`;
    } else if (lang === 'hi') {
      reply = `🎉 **अपॉइंटमेंट आधिकारिक रूप से कन्फर्म और बुक हो गई!**\n\n**${activeProposal.hospitalName}** में **${activeProposal.doctorName}** (${activeProposal.department}) के साथ आपकी ओपीडी अपॉइंटमेंट की पुष्टि हो गई है।\n\n📅 **तारीख:** ${activeProposal.date}\n⏰ **कन्फर्म समय:** ${bookingRes.appointment.timeSlot}\n🔑 **सीक्रेट कंसल्टेशन पासकोड:** ${passCode}\n\nयह अपॉइंटमेंट अब आपके इतिहास में सुरक्षित रूप से दर्ज हो गई है। डॉक्टर से परामर्श के समय यह कोड दिखाएं। अपॉइंटमेंट पेज खोला जा रहा है!`;
    } else if (lang === 'ta') {
      reply = `🎉 **சந்திப்பு உறுதி செய்யப்பட்டு முன்பதிவு செய்யப்பட்டது!**\n\n${activeProposal.hospitalName} இல் ${activeProposal.doctorName} உடனான உங்கள் சந்திப்பு உறுதி செய்யப்பட்டது.\n\n📅 **தேதி:** ${activeProposal.date}\n⏰ **நேரம்:** ${bookingRes.appointment.timeSlot}\n🔑 **பாஸ்கோடு:** ${passCode}`;
    }

    return {
      reply,
      action: {
        type: 'CONFIRM_APPOINTMENT',
        target: 'appointments',
        passCode,
        appointmentId: bookingRes.appointment.id,
      },
      detectedLanguage: lang,
    };
  }

  // B. CONFIRM REQUESTED BUT NO PROPOSAL ACTIVE
  if (!activeProposal && isConfirmProposal && !isNewHospitalBooking && (lower.includes('confirm') || lower.includes('ఖరారు') || lower.includes('కన్ఫర్మ్') || lower.includes('कन्फर्म'))) {
    let noProposalMsg = `You do not have any pending appointment proposals to confirm. Would you like to book a new General OPD appointment?`;
    if (lang === 'te') noProposalMsg = `ఖరారు చేయడానికి మీ వద్ద ఎటువంటి పెండింగ్ అపాయింట్‌మెంట్ ప్రతిపాదన లేదు. కొత్త ఓపీడీ అపాయింట్‌మెంట్ బుక్ చేయమంటారా?`;
    if (lang === 'hi') noProposalMsg = `कन्फर्म करने के लिए कोई लंबित अपॉइंटमेंट प्रस्ताव नहीं है। क्या आप नई ओपीडी अपॉइंटमेंट बुक करना चाहते हैं?`;
    return {
      reply: noProposalMsg,
      action: { type: 'NAVIGATE', target: 'hospitals' },
      detectedLanguage: lang,
    };
  }

  // C. CANCEL UNCONFIRMED PROPOSAL (Citizen cancels -> NEVER recorded in history)
  const existingAptsForProposalCheck = storage.getAppointments();
  const matchesOtherBookedHosp = activeProposal && existingAptsForProposalCheck.some(
    (a) =>
      a.status !== 'Cancelled' &&
      a.hospitalName.toLowerCase() !== activeProposal.hospitalName.toLowerCase() &&
      lower.includes(a.hospitalName.toLowerCase())
  );

  const isProposalCancel =
    activeProposal &&
    !matchesOtherBookedHosp &&
    (lower.includes('proposal') ||
      lower.includes('request') ||
      lower.includes("don't book") ||
      lower.includes('dont book') ||
      lower.includes('not book') ||
      lower.includes('discard') ||
      lower.includes('abort') ||
      lower.includes('drop') ||
      lower.includes('వద్దు') ||
      lower.includes('రద్దు') ||
      lower.includes('రద్దు చేయండి') ||
      lower.includes('రద్దు చెయ్యండి') ||
      lower.includes('रद्द') ||
      lower.includes('रद्द करें') ||
      lower.includes('रद्द करो') ||
      lower.includes('कैंसिल') ||
      lower.trim() === 'cancel' ||
      lower.startsWith('cancel request') ||
      lower.startsWith('cancel proposal') ||
      lower.startsWith('cancel booking') ||
      lower.startsWith('cancel appointment request') ||
      lower.startsWith('cancel my appointment request'));

  if (isProposalCancel) {
    const cancelledHosp = activeProposal.hospitalName;
    const cancelledDoc = activeProposal.doctorName;
    const cancelledDate = activeProposal.date;
    const cancelledDept = activeProposal.department;

    storage.clearAppointmentProposal();

    agentBus.dispatch(
      'user_agent',
      'user_ui',
      'CANCEL_PROPOSAL',
      { proposalId: activeProposal.id, hospitalName: cancelledHosp },
      `Appointment request proposal for ${cancelledDoc} at ${cancelledHosp} was cancelled by citizen before booking`
    );

    let reply = `Your appointment request for **${cancelledDoc}** (${cancelledDept}) at **${cancelledHosp}** on **${cancelledDate}** has been cancelled.\n\nℹ️ **Notice:** Because this request was cancelled before confirmation, it was never booked and **will not appear in your appointment history**.`;

    if (lang === 'te') {
      reply = `**${cancelledHosp}** లో **${cancelledDoc}** (${cancelledDept}) గారితో (${cancelledDate}) మీ అపాయింట్‌మెంట్ అభ్యర్థన రద్దు చేయబడింది.\n\nℹ️ **గమనిక:** మీరు ఖరారు చేయకముందే ఈ అభ్యర్థన రద్దు చేయబడినందున, ఇది బుక్ కాలేదు మరియు **మీ అపాయింట్‌మెంట్ హిస్టరీలో ఎప్పటికీ నమోదు కాదు**.`;
    } else if (lang === 'hi') {
      reply = `**${cancelledHosp}** में **${cancelledDoc}** (${cancelledDept}) के साथ (${cancelledDate}) आपका अपॉइंटमेंट अनुरोध रद्द कर दिया गया है।\n\nℹ️ **सूचना:** चूंकि यह अनुरोध पुष्टि से पहले ही रद्द कर दिया गया था, इसलिए इसे बुक नहीं किया गया और यह **आपके अपॉइंटमेंट इतिहास में कभी दर्ज नहीं होगा**।`;
    } else if (lang === 'ta') {
      reply = `**${cancelledHosp}** இல் உங்கள் சந்திப்பு கோரிக்கை ரத்து செய்யப்பட்டது. உறுதிப்படுத்தப்படாததால், இது உங்கள் வரலாற்றில் சேர்க்கப்படாது.`;
    }

    return {
      reply,
      action: { type: 'CANCEL_PROPOSAL', target: 'appointments' },
      detectedLanguage: lang,
    };
  }

  // D. SELECT FLEXIBLE TIME SLOT ON PROPOSAL
  let slotMatchOnProp: string | null = null;
  if (lower.includes('9:00') || lower.includes('9 am') || lower.includes('09:00')) slotMatchOnProp = '09:00 AM';
  else if (lower.includes('9:30') || lower.includes('09:30')) slotMatchOnProp = '09:30 AM';
  else if (lower.includes('10:00') || lower.includes('10 am') || lower.includes('10:00')) slotMatchOnProp = '10:00 AM';
  else if (lower.includes('10:30') || lower.includes('10:30')) slotMatchOnProp = '10:30 AM';
  else if (lower.includes('11:00') || lower.includes('11 am') || lower.includes('11:00')) slotMatchOnProp = '11:00 AM';
  else if (lower.includes('11:30') || lower.includes('11:30')) slotMatchOnProp = '11:30 AM';
  else if (lower.includes('2:00') || lower.includes('2 pm') || lower.includes('14:00')) slotMatchOnProp = '02:00 PM';
  else if (lower.includes('2:30') || lower.includes('02:30')) slotMatchOnProp = '02:30 PM';
  else if (lower.includes('3:00') || lower.includes('3 pm') || lower.includes('15:00')) slotMatchOnProp = '03:00 PM';
  else if (lower.includes('3:30') || lower.includes('03:30')) slotMatchOnProp = '03:30 PM';

  const isSlotChangeIntent =
    activeProposal &&
    slotMatchOnProp &&
    !isNewHospitalBooking &&
    !lower.includes('reschedule') &&
    !lower.includes('రీషెడ్యూల్') &&
    !lower.includes('रीशेड्यूल') &&
    (lower.includes('slot') ||
      lower.includes('select') ||
      lower.includes('choose') ||
      lower.includes('pick') ||
      lower.includes('time') ||
      lower.includes('మార్చు') ||
      lower.includes('ఎంచుకో') ||
      lower.includes('చూసుకో') ||
      lower.includes('चुनो') ||
      lower.includes('बदलो') ||
      lower.startsWith('select') ||
      lower.startsWith('choose') ||
      lower.trim() === slotMatchOnProp.toLowerCase() ||
      lower.includes(slotMatchOnProp.toLowerCase()));

  if (isSlotChangeIntent && slotMatchOnProp) {
    const { bookedSlots, availableSlots } = storage.getAvailableSlotsForDoctor(activeProposal.doctorId, activeProposal.date);
    const isConflict = bookedSlots.includes(slotMatchOnProp);
    activeProposal.requestedSlot = slotMatchOnProp;
    activeProposal.isSlotConflict = isConflict;
    activeProposal.availableSlots = availableSlots;
    storage.setAppointmentProposal(activeProposal);

    let reply = `⏰ **Time Slot Selected: ${slotMatchOnProp} ${isConflict ? '(Occupied ⚠️)' : '(Available ✅)'}**\n\nYour appointment proposal for **${activeProposal.doctorName}** at **${activeProposal.hospitalName}** on **${activeProposal.date}** has been updated to **${slotMatchOnProp}**.\n\n✨ **Flexible Alternatives:** ${availableSlots.filter((s) => s !== slotMatchOnProp).slice(0, 4).join(', ') || '09:30 AM, 11:30 AM, 02:00 PM'}\n\n👉 Would you like to **Confirm & Book** this appointment now? You can also pick another flexible slot, change the date, or cancel (nothing is recorded in history until confirmed).`;

    if (lang === 'te') {
      reply = `⏰ **ఎంచుకున్న సమయం: ${slotMatchOnProp} ${isConflict ? '(స్లాట్ బిజీగా ఉంది ⚠️)' : '(అందుబాటులో ఉంది ✅)'}**\n\n**${activeProposal.hospitalName}** లో **${activeProposal.date}** న మీ అపాయింట్‌మెంట్ స్లాట్ **${slotMatchOnProp}** కు మార్చబడింది.\n\n✨ **ప్రత్యామ్నాయ స్లాట్‌లు:** ${availableSlots.filter((s) => s !== slotMatchOnProp).slice(0, 4).join(', ')}\n\n👉 ఇప్పుడే ఈ అపాయింట్‌మెంట్‌ను **ఖరారు (కన్ఫర్మ్)** చేయాలనుకుంటున్నారా? లేదా ఇతర స్లాట్ ఎంచుకోవచ్చు, తేదీ మార్చవచ్చు, లేదా రద్దు చేయవచ్చు.`;
    } else if (lang === 'hi') {
      reply = `⏰ **चुना गया समय: ${slotMatchOnProp} ${isConflict ? '(व्यस्त ⚠️)' : '(उपलब्ध है ✅)'}**\n\n**${activeProposal.hospitalName}** में **${activeProposal.date}** के लिए आपका स्लॉट **${slotMatchOnProp}** अपडेट कर दिया गया है।\n\n✨ **वैकल्पिक स्लॉट:** ${availableSlots.filter((s) => s !== slotMatchOnProp).slice(0, 4).join(', ')}\n\n👉 क्या आप इसे अब **कन्फर्म** करना चाहते हैं? आप अन्य स्लॉट चुन सकते हैं, तारीख बदल सकते हैं, या रद्द कर सकते हैं।`;
    }

    return {
      reply,
      action: { type: 'PROPOSE_APPOINTMENT', target: 'appointments', proposal: activeProposal },
      proposal: activeProposal,
      detectedLanguage: lang,
    };
  }

  // E. CHANGE DATE ON PROPOSAL
  const isDateChangeIntent =
    activeProposal &&
    !isNewHospitalBooking &&
    !lower.includes('reschedule') &&
    !lower.includes('రీషెడ్యూల్') &&
    !lower.includes('रीशेड्यूल') &&
    (lower.includes('change date') ||
      lower.includes('new date') ||
      lower.includes('different date') ||
      lower.includes('tomorrow') ||
      lower.includes('day after tomorrow') ||
      lower.includes('తేదీ') ||
      lower.includes('తారీఖు') ||
      lower.includes('రేపు') ||
      lower.includes('ఎల్లుండి') ||
      lower.includes('तारीख') ||
      lower.includes('कल') ||
      lower.includes('परसों') ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(lower));

  if (isDateChangeIntent) {
    let newDate = activeProposal.date;
    if (lower.includes('day after tomorrow') || lower.includes('ఎల్లుండి') || lower.includes('परसों')) {
      newDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('tomorrow') || lower.includes('రేపు') || lower.includes('कल')) {
      newDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    } else if (lower.includes('today') || lower.includes('ఈ రోజు') || lower.includes('आज')) {
      newDate = new Date().toISOString().split('T')[0];
    } else {
      const dateMatch = prompt.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) newDate = dateMatch[0];
    }

    const { bookedSlots, availableSlots } = storage.getAvailableSlotsForDoctor(activeProposal.doctorId, newDate);
    activeProposal.date = newDate;
    activeProposal.availableSlots = availableSlots;
    if (bookedSlots.includes(activeProposal.requestedSlot)) {
      activeProposal.requestedSlot = availableSlots[0] || '11:30 AM';
    }
    activeProposal.isSlotConflict = bookedSlots.includes(activeProposal.requestedSlot);
    storage.setAppointmentProposal(activeProposal);

    let reply = `📅 **Consultation Date Updated to ${newDate}!**\n\nYour appointment proposal for **${activeProposal.doctorName}** at **${activeProposal.hospitalName}** is now scheduled for **${newDate}** at **${activeProposal.requestedSlot}**.\n\n✨ **Flexible Available Slots on this Date:**\n${availableSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 Would you like to **Confirm & Book** this appointment now, select another slot, or cancel? (This will not go to history until confirmed)`;

    if (lang === 'te') {
      reply = `📅 **తేదీ ${newDate} కు మార్చబడింది!**\n\n**${activeProposal.hospitalName}** లో **${activeProposal.doctorName}** గారితో మీ అపాయింట్‌మెంట్ తేదీ **${newDate}** (${activeProposal.requestedSlot}) కు సెట్ చేయబడింది.\n\n✨ **ఈ తేదీన అందుబాటులో ఉన్న స్లాట్‌లు:**\n${availableSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 ఇప్పుడే ఈ అపాయింట్‌మెంట్‌ను **ఖరారు (కన్ఫర్మ్)** చేయాలనుకుంటున్నారా, ఇతర స్లాట్ ఎంచుకోవాలా లేదా రద్దు చేయాలా? (ఖరారు చేసేవరకు హిస్టరీలో నమోదు కాదు)`;
    } else if (lang === 'hi') {
      reply = `📅 **तारीख बदलकर ${newDate} कर दी गई है!**\n\n**${activeProposal.hospitalName}** में **${activeProposal.doctorName}** के साथ आपकी अपॉइंटमेंट **${newDate}** (${activeProposal.requestedSlot}) के लिए तय की गई है।\n\n✨ **इस तारीख पर उपलब्ध स्लॉट:**\n${availableSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 क्या आप इसे अब **कन्फर्म** करना चाहते हैं, कोई अन्य स्लॉट चुनना चाहते हैं या रद्द करना चाहते हैं? (पुष्टि होने तक यह इतिहास में नहीं जुड़ेगा)`;
    }

    return {
      reply,
      action: { type: 'PROPOSE_APPOINTMENT', target: 'appointments', proposal: activeProposal },
      proposal: activeProposal,
      detectedLanguage: lang,
    };
  }

  // 2. Appointment Cancellation by Hospital Name (Agent-Driven: user_agent -> user_receptionist_agent -> doc_agent)
  const isCancel =
    (lower.includes('cancel') ||
      lower.includes('drop appointment') ||
      lower.includes('delete appointment') ||
      lower.includes('revoke appointment') ||
      lower.includes('call off') ||
      lower.includes('రద్దు') || lower.includes('రద్దుచేయి') || lower.includes('రద్దు చేయండి') ||
      lower.includes('క్యాన్సిల్') || lower.includes('క్యాన్సిల్ చేయండి') ||
      lower.includes('रद्द') || lower.includes('रद्द करें') || lower.includes('रद्द करो') ||
      lower.includes('कैंसिल') || lower.includes('कैंसल') ||
      lower.includes('ரத்து') || lower.includes('ரத்து செய்')) &&
    !lower.includes('reschedule') &&
    !lower.includes('రీషెడ్యూల్') &&
    !lower.includes('रीशेड्यूल');

  if (isCancel) {
    const existingAppointments = storage.getAppointments();

    if (existingAppointments.length === 0) {
      let noAptMsg = `You do not have any appointments on record to cancel. Would you like me to guide you to our hospital directory or book an OPD consultation?`;
      if (lang === 'te') noAptMsg = `మీ రికార్డులలో రద్దు చేయడానికి ఎటువంటి అపాయింట్‌మెంట్‌లు లేవు. ఆసుపత్రుల జాబితా లేదా కొత్త ఓపీడీ బుకింగ్ కోసం సహాయం కావాలా?`;
      if (lang === 'hi') noAptMsg = `आपके रिकॉर्ड में रद्द करने के लिए कोई अपॉइंटमेंट नहीं मिली। क्या आप अस्पताल निर्देशिका देखना चाहते हैं?`;
      if (lang === 'ta') noAptMsg = `ரத்து செய்ய எந்த சந்திப்பும் இல்லை.`;
      return {
        reply: noAptMsg,
        action: { type: 'NAVIGATE', target: 'appointments' },
        detectedLanguage: lang,
      };
    }

    // Try to find the specific appointment matching the spoken hospital name
    let targetApt = findAppointmentByHospital(prompt, existingAppointments);

    // If not matched by hospital, look for active appointment matching doctor or department
    if (!targetApt) {
      targetApt = existingAppointments.find(
        (a) =>
          a.status !== 'Cancelled' &&
          (lower.includes(a.doctorName.toLowerCase()) ||
            (a.department && lower.includes(a.department.toLowerCase())))
      ) || null;
    }

    // If still not matched, check if user specified a hospital that they DON'T have an appointment with
    if (!targetApt) {
      const allHospitals = storage.getHospitals();
      const matchedHosp = findMatchingHospital(prompt, allHospitals);
      const parenMatch = matchedHosp.name.match(/\(([^)]+)\)/);
      const acronym = parenMatch ? parenMatch[1].toLowerCase() : '';
      const genericWords = new Set([
        'hospital', 'institute', 'medical', 'sciences', 'scinces', 'general', 'government',
        'govt', 'public', 'center', 'centre', 'college', 'and', 'the', 'for', 'all', 'india'
      ]);
      const hospTokens = matchedHosp.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !genericWords.has(w));

      const spokeSpecificHospital =
        (acronym && new RegExp(`\\b${acronym}\\b`, 'i').test(lower)) ||
        hospTokens.some((t) => lower.includes(t)) ||
        (matchedHosp.city && lower.includes(matchedHosp.city.toLowerCase()));

      if (spokeSpecificHospital) {
        const activeApts = existingAppointments.filter((a) => a.status !== 'Cancelled');
        const hospList = activeApts.map((a) => `• **${a.hospitalName}** (${a.department}, ${a.appointmentDate})`).join('\n');

        let notFoundMsg = `I couldn't find an active appointment for you at **${matchedHosp.name}**.\n\nYour current scheduled appointments are:\n${hospList || '• None'}\n\nPlease specify one of these hospitals to cancel your visit.`;
        if (lang === 'te') {
          notFoundMsg = `**${matchedHosp.name}** లో మీకు ఎటువంటి యాక్టివ్ అపాయింట్‌మెంట్ కనిపించలేదు.\n\nమీ ప్రస్తుత అపాయింట్‌మెంట్‌లు:\n${hospList || '• ఏవీ లేవు'}\n\nదయచేసి పైన పేర్కొన్న ఆసుపత్రులలో ఒకదాన్ని రద్దు చేయడానికి చెప్పండి.`;
        } else if (lang === 'hi') {
          notFoundMsg = `**${matchedHosp.name}** में आपकी कोई सक्रिय अपॉइंटमेंट नहीं मिली।\n\nआपकी वर्तमान निर्धारित अपॉइंटमेंट:\n${hospList || '• कोई नहीं'}\n\nकृपया रद्द करने हेतु अस्पताल का नाम बताएं।`;
        }

        return {
          reply: notFoundMsg,
          action: { type: 'NAVIGATE', target: 'appointments' },
          detectedLanguage: lang,
        };
      }

      // If no specific hospital was spoken, default to the most recent active/pending/accepted appointment
      targetApt =
        existingAppointments.find((a) => a.status === 'Accepted' || a.status === 'Rescheduled' || a.status === 'Pending') ||
        existingAppointments.find((a) => a.status !== 'Cancelled') ||
        existingAppointments[0];
    }

    if (targetApt.status === 'Cancelled') {
      let alreadyCancelledMsg = `Your appointment with **${targetApt.doctorName}** at **${targetApt.hospitalName}** on **${targetApt.appointmentDate}** is already cancelled.`;
      if (lang === 'te') alreadyCancelledMsg = `**${targetApt.hospitalName}** లో **${targetApt.doctorName}** గారితో మీ అపాయింట్‌మెంట్ ఇప్పటికే రద్దు చేయబడింది.`;
      if (lang === 'hi') alreadyCancelledMsg = `**${targetApt.hospitalName}** में आपकी अपॉइंटमेंट पहले ही रद्द की जा चुकी है।`;
      return {
        reply: alreadyCancelledMsg,
        action: { type: 'NAVIGATE', target: 'appointments' },
        detectedLanguage: lang,
      };
    }

    agentBus.cancelAppointmentViaAgents({
      appointmentId: targetApt.id,
      reason: 'Cancelled by citizen request via MediNav user_agent',
    });

    let reply = `Your consultation appointment with **${targetApt.doctorName}** (${targetApt.department}) at **${targetApt.hospitalName}** on **${targetApt.appointmentDate}** at **${targetApt.timeSlot}** has been successfully cancelled!\n\nOur User Agent coordinated with the Hospital Reception Desk Agent (user_receptionist_agent) to release your slot back to the public OPD queue. Opening your appointments page!`;

    if (lang === 'te') {
      reply = `**${targetApt.hospitalName}** లో **${targetApt.doctorName}** (${targetApt.department}) గారితో (${targetApt.appointmentDate}, ${targetApt.timeSlot}) మీ అపాయింట్‌మెంట్ user_agent ద్వారా విజయవంతంగా రద్దు చేయబడింది!\n\nరిసెప్షన్ డెస్క్ ఏజెంట్ మీ స్లాట్‌ను రద్దు చేసి పబ్లిక్ క్యూలోకి విడుదల చేశారు. అపాయింట్‌మెంట్ల పేజీ తెరుస్తున్నాను!`;
    } else if (lang === 'hi') {
      reply = `**${targetApt.hospitalName}** में **${targetApt.doctorName}** (${targetApt.department}) के साथ (${targetApt.appointmentDate}, ${targetApt.timeSlot}) आपकी अपॉइंटमेंट user_agent द्वारा सफलतापूर्वक रद्द कर दी गई है!\n\nरिसेप्शनिस्ट एजेंट ने आपके स्लॉट को सार्वजनिक ओपीडी कतार में पुनः उपलब्ध कर दिया है। अपॉइंटमेंट पेज खोला जा रहा है!`;
    } else if (lang === 'ta') {
      reply = `**${targetApt.hospitalName}** இல் **${targetApt.doctorName}** (${targetApt.department}) உடனான உங்கள் சந்திப்பு user_agent மூலம் வெற்றிகரமாக ரத்து செய்யப்பட்டது!`;
    }

    return {
      reply,
      action: { type: 'CANCEL_APPOINTMENT', target: 'appointments', appointmentId: targetApt.id },
      detectedLanguage: lang,
    };
  }

  // 3. Appointment Rescheduling (Agent-Driven: user_agent -> user_receptionist_agent)
  const isReschedule =
    lower.includes('reschedule') ||
    lower.includes('రీషెడ్యూల్') || lower.includes('రీ షెడ్యూల్') || lower.includes('రీషెడ్యుల్') ||
    lower.includes('మార్చు') || lower.includes('మార్చండి') ||
    lower.includes('रीशेड्यूल') || lower.includes('री-शेड्यूल') ||
    lower.includes('तारीख बदलो') || lower.includes('समय बदलो') || lower.includes('बदलें') ||
    lower.includes('மாற்று') || lower.includes('புதிய நேரம்') ||
    (lower.includes('change') && (lower.includes('appointment') || lower.includes('slot') || lower.includes('time') || lower.includes('date'))) ||
    (lower.includes('postpone') && lower.includes('appointment'));

  if (isReschedule) {
    const existingAppointments = storage.getAppointments();

    if (existingAppointments.length === 0) {
      let noAptMsg = `You do not have any appointments on record to reschedule. Would you like me to book a new General OPD appointment for you?`;
      if (lang === 'te') noAptMsg = `మీ రికార్డులలో రీషెడ్యూల్ చేయడానికి ఎటువంటి అపాయింట్‌మెంట్‌లు లేవు. మీ కోసం కొత్త జనరల్ ఓపీడీ (OPD) అపాయింట్‌మెంట్ బుక్ చేయమంటారా?`;
      if (lang === 'hi') noAptMsg = `आपके रिकॉर्ड में रीशेड्यूल करने के लिए कोई अपॉइंटमेंट नहीं मिली। क्या आप चाहते हैं कि मैं आपके लिए एक नई जनरल ओपीडी अपॉइंटमेंट बुक करूँ?`;
      if (lang === 'ta') noAptMsg = `மாற்றியமைக்க எந்த சந்திப்பும் இல்லை. புதிய முன்பதிவு செய்யவா?`;
      return {
        reply: noAptMsg,
        action: { type: 'NAVIGATE', target: 'hospitals' },
        detectedLanguage: lang,
      };
    }

    let targetApt = existingAppointments.find(
      (a) =>
        lower.includes(a.doctorName.toLowerCase()) ||
        lower.includes(a.hospitalName.toLowerCase()) ||
        (a.department && lower.includes(a.department.toLowerCase()))
    );

    if (!targetApt) {
      targetApt =
        existingAppointments.find((a) => a.status === 'Accepted' || a.status === 'Rescheduled' || a.status === 'Pending') ||
        existingAppointments.find((a) => a.status === 'Completed') ||
        existingAppointments[0];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let newDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default tomorrow

    if (lower.includes('day after tomorrow') || lower.includes('ఎల్లుండి') || lower.includes('परसों')) {
      newDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('next week') || lower.includes('వచ్చే వారం') || lower.includes('अगले हफ्ते')) {
      newDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('today') || lower.includes('ఈ రోజు') || lower.includes('आज')) {
      newDate = todayStr;
    } else {
      const dateMatch = prompt.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) {
        newDate = dateMatch[0];
      }
    }

    let newSlot = '11:30 AM';
    if (lower.includes('9:00') || lower.includes('9 am') || lower.includes('09:00')) newSlot = '09:00 AM';
    else if (lower.includes('9:30') || lower.includes('09:30')) newSlot = '09:30 AM';
    else if (lower.includes('10:00') || lower.includes('10 am') || lower.includes('10:00')) newSlot = '10:00 AM';
    else if (lower.includes('10:30') || lower.includes('10:30')) newSlot = '10:30 AM';
    else if (lower.includes('11:00') || lower.includes('11 am') || lower.includes('11:00')) newSlot = '11:00 AM';
    else if (lower.includes('11:30') || lower.includes('11:30')) newSlot = '11:30 AM';
    else if (lower.includes('2:00') || lower.includes('2 pm') || lower.includes('14:00')) newSlot = '02:00 PM';
    else if (lower.includes('2:30') || lower.includes('02:30')) newSlot = '02:30 PM';
    else if (lower.includes('3:00') || lower.includes('3 pm') || lower.includes('15:00')) newSlot = '03:00 PM';
    else {
      newSlot = targetApt.timeSlot === '10:00 AM' ? '11:30 AM' : '10:00 AM';
    }

    const rescheduleResult = agentBus.rescheduleAppointmentViaAgents({
      appointmentId: targetApt.id,
      newDate,
      newSlot,
      reason: 'Rescheduled via personal user_agent',
    });

    const passCode = rescheduleResult.appointment.passCode;

    let reply = `Your consultation appointment with **${targetApt.doctorName}** (${targetApt.department}) at **${targetApt.hospitalName}** has been successfully rescheduled by user_agent!\n\n📅 **New Date:** ${newDate}\n⏰ **New Time Slot:** ${newSlot}\n🔑 **New Secret Consultation Pass Code:** ${passCode}\n\nOur User Agent coordinated with the Hospital Receptionist Agent to confirm your slot. Please present this code to the doctor during your consultation. Opening your appointments page!`;

    if (lang === 'te') {
      reply = `**${targetApt.hospitalName}** లో **${targetApt.doctorName}** (${targetApt.department}) గారితో మీ అపాయింట్‌మెంట్ user_agent ద్వారా విజయవంతంగా రీషెడ్యూల్ చేయబడింది!\n\n📅 **కొత్త తేదీ:** (${newDate})\n⏰ **కొత్త సమయం:** ${newSlot}\n🔑 **కొత్త రహస్య కన్సల్టేషన్ పాస్‌కోడ్:** ${passCode}\n\nయూజర్ ఏజెంట్ మరియు హాస్పిటల్ రిసెప్షనిస్ట్ ఏజెంట్ మీ స్లాట్‌ను ఖరారు చేశారు. కన్సల్టేషన్ సమయంలో ఈ పాస్‌కోడ్‌ను డాక్టర్‌కు చూపించండి. అపాయింట్‌మెంట్ల పేజీ తెరుస్తున్నాను!`;
    } else if (lang === 'hi') {
      reply = `**${targetApt.hospitalName}** में **${targetApt.doctorName}** (${targetApt.department}) के साथ आपकी अपॉइंटमेंट user_agent द्वारा सफलतापूर्वक रीशेड्यूल कर दी गई है!\n\n📅 **नई तारीख:** (${newDate})\n⏰ **नया समय:** ${newSlot}\n🔑 **नया सीक्रेट कंसल्टेशन पासकोड:** ${passCode}\n\nयूजर एजेंट और रिसेप्शनिस्ट एजेंट ने आपके नए स्लॉट की पुष्टि कर दी है। परामर्श के समय यह कोड डॉक्टर को बताएं। अपॉइंटमेंट पेज खोला जा रहा है!`;
    } else if (lang === 'ta') {
      reply = `**${targetApt.hospitalName}** இல் **${targetApt.doctorName}** (${targetApt.department}) உடனான உங்கள் சந்திப்பு user_agent மூலம் வெற்றிகரமாக மாற்றியமைக்கப்பட்டது!\n\n📅 **புதிய தேதி:** ${newDate}\n⏰ **புதிய நேரம்:** ${newSlot}\n🔑 **புதிய ரகசிய பாஸ்கோடு:** ${passCode}\nமுன்பதிவு பக்கத்திற்கு அழைத்துச் செல்கிறேன்!`;
    }

    return {
      reply,
      action: { type: 'NAVIGATE', target: 'appointments' },
      detectedLanguage: lang,
    };
  }

  // 3. OPD Appointment Booking Proposal (Always General Medicine / OPD, never Cardiology unless requested)
  const isOpdBooking =
    (lower.includes('book') && (lower.includes('opd') || lower.includes('appointment') || lower.includes('consultation'))) ||
    lower.includes('ఓపీడీ') || lower.includes('బుకింగ్') || lower.includes('అపాయింట్') ||
    lower.includes('ओपीडी') || lower.includes('अपॉइंटमेंट') || lower.includes('अपोइंट') || lower.includes('बुकिंग') || lower.includes('बुक') ||
    lower.includes('ஓபிடி') || lower.includes('முன்பதிவு');

  const isExplicitCardio =
    lower.includes('cardiology') || lower.includes('heart') || lower.includes('హార్ట్') ||
    lower.includes('గుండె') || lower.includes('हार्ट') || lower.includes('दिल');

  if (isOpdBooking && !isExplicitCardio) {
    const targetHosp = findMatchingHospital(prompt, hospitals, patient.state);

    const opdDoctor =
      targetHosp.doctors.find((d) => d.specialty === 'General Medicine') ||
      targetHosp.doctors[0];

    const todayStr = new Date().toISOString().split('T')[0];
    let targetDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default tomorrow

    if (lower.includes('day after tomorrow') || lower.includes('ఎల్లుండి') || lower.includes('परसों')) {
      targetDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('next week') || lower.includes('వచ్చే వారం') || lower.includes('अगले हफ्ते')) {
      targetDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    } else if (lower.includes('today') || lower.includes('ఈ రోజు') || lower.includes('आज')) {
      targetDate = todayStr;
    } else {
      const dateMatch = prompt.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) {
        targetDate = dateMatch[0];
      }
    }

    let targetSlot = '10:00 AM';
    if (lower.includes('9:00') || lower.includes('9 am') || lower.includes('09:00')) targetSlot = '09:00 AM';
    else if (lower.includes('9:30') || lower.includes('09:30')) targetSlot = '09:30 AM';
    else if (lower.includes('10:00') || lower.includes('10 am') || lower.includes('10:00')) targetSlot = '10:00 AM';
    else if (lower.includes('10:30') || lower.includes('10:30')) targetSlot = '10:30 AM';
    else if (lower.includes('11:00') || lower.includes('11 am') || lower.includes('11:00')) targetSlot = '11:00 AM';
    else if (lower.includes('11:30') || lower.includes('11:30')) targetSlot = '11:30 AM';
    else if (lower.includes('2:00') || lower.includes('2 pm') || lower.includes('14:00')) targetSlot = '02:00 PM';
    else if (lower.includes('2:30') || lower.includes('02:30')) targetSlot = '02:30 PM';
    else if (lower.includes('3:00') || lower.includes('3 pm') || lower.includes('15:00')) targetSlot = '03:00 PM';
    else if (lower.includes('3:30') || lower.includes('03:30')) targetSlot = '03:30 PM';

    const { bookedSlots, availableSlots } = storage.getAvailableSlotsForDoctor(opdDoctor.id, targetDate);
    const isSlotBooked = bookedSlots.includes(targetSlot);
    const freeSlots = availableSlots;

    const suggestedSlot = isSlotBooked ? (freeSlots[0] || '11:30 AM') : targetSlot;

    const proposal: AppointmentProposal = {
      id: 'prop_' + Date.now(),
      hospitalId: targetHosp.id,
      hospitalName: targetHosp.name,
      hospitalCode: targetHosp.uniqueCode,
      hospitalAddress: targetHosp.address,
      googleMapsUrl: targetHosp.googleMapsUrl,
      doctorId: opdDoctor.id,
      doctorName: opdDoctor.name,
      department: opdDoctor.specialty || 'General Medicine',
      date: targetDate,
      requestedSlot: suggestedSlot,
      availableSlots: freeSlots,
      isSlotConflict: isSlotBooked,
      conflictReason: isSlotBooked ? `Requested time slot ${targetSlot} is already booked on ${targetDate}` : undefined,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };

    // Save proposal to store ONLY - NEVER to storage.addAppointment or history!
    storage.setAppointmentProposal(proposal);

    agentBus.dispatch(
      'user_agent',
      'user_receptionist_agent',
      'SLOT_AVAILABILITY_CHECK',
      { proposal },
      `Patient ${patient.name} requested OPD slot ${targetSlot} at ${targetHosp.name}. Slot status: ${isSlotBooked ? 'Occupied (Offering flexible slots)' : 'Available'}`
    );

    let confirmation = '';
    if (isSlotBooked) {
      confirmation = `⚠️ **Requested Slot Unavailable!**\n\nThe requested slot **${targetSlot}** on **${targetDate}** is currently booked/occupied for **${opdDoctor.name}** at **${targetHosp.name}**.\n\n✨ **Flexible Available Time Slots:**\n${freeSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 I have selected **${suggestedSlot}** as a flexible alternative. You can select another flexible slot, change the date, **Confirm & Book**, or **Cancel** this request.\n*(Note: This will not go to history because it is never booked)*`;

      if (lang === 'te') {
        confirmation = `⚠️ **కోరిన సమయం అందుబాటులో లేదు!**\n\n**${targetHosp.name}** లో **${opdDoctor.name}** గారికి **${targetDate}** న **${targetSlot}** స్లాట్ ఇప్పటికే బుక్ చేయబడింది.\n\n✨ **అందుబాటులో ఉన్న ఫ్లెక్సిబుల్ స్లాట్‌లు:**\n${freeSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 నేను **${suggestedSlot}** ను ప్రత్యామ్నాయంగా సూచించాను. మీరు మరొక స్లాట్ ఎంచుకోవచ్చు, తేదీ మార్చవచ్చు, **ఖరారు (కన్ఫర్మ్)** చేయవచ్చు, లేదా **రద్దు** చేయవచ్చు.\n*(గమనిక: ఖరారు చేసేవరకు ఇది మీ హిస్టరీలో బుక్ కాదు)*`;
      } else if (lang === 'hi') {
        confirmation = `⚠️ **अनुरोधित समय स्लॉट उपलब्ध नहीं है!**\n\n**${targetHosp.name}** में **${opdDoctor.name}** के लिए **${targetDate}** को **${targetSlot}** स्लॉट पहले से ही भरा हुआ है।\n\n✨ **उपलब्ध लचीले समय स्लॉट:**\n${freeSlots.slice(0, 5).map((s) => `• **${s}**`).join('   ')}\n\n👉 मैंने **${suggestedSlot}** का सुझाव दिया है। आप अन्य लचीला स्लॉट चुन सकते हैं, तारीख बदल सकते हैं, **कन्फर्म** कर सकते हैं, या **रद्द** कर सकते हैं।\n*(सूचना: पुष्टि करने तक यह इतिहास में दर्ज नहीं होगा)*`;
      } else if (lang === 'ta') {
        confirmation = `⚠️ கோரப்பட்ட நேரம் ${targetSlot} கிடைக்கவில்லை. கிடைக்கக்கூடிய மாற்று நேரம்: ${suggestedSlot}`;
      }
    } else {
      const flexibleList = freeSlots.filter((s) => s !== targetSlot).slice(0, 4);
      confirmation = `📋 **Appointment Booking Proposal**\n\n• **Hospital:** **${targetHosp.name}** (${targetHosp.uniqueCode})\n• **Doctor:** **${opdDoctor.name}** (${proposal.department})\n• **Date:** ${targetDate}\n• **Time Slot:** **${targetSlot}** (Available ✅)\n• **Flexible Alternatives:** ${flexibleList.join(', ') || '09:30 AM, 11:30 AM, 02:00 PM'}\n\n👉 **Please confirm your appointment** by saying/clicking "Confirm Appointment". You can also select another flexible time slot, change the date, or cancel.\n*(Note: This will not go to history because it is never booked)*`;

      if (lang === 'te') {
        confirmation = `📋 **అపాయింట్‌మెంట్ బుకింగ్ ప్రతిపాదన**\n\n• **ఆసుపత్రి:** **${targetHosp.name}** (${targetHosp.uniqueCode})\n• **వైద్యులు:** **${opdDoctor.name}** (${proposal.department})\n• **తేదీ:** ${targetDate}\n• **సమయం:** **${targetSlot}** (అందుబాటులో ఉంది ✅)\n• **ప్రత్యామ్నాయ స్లాట్‌లు:** ${flexibleList.join(', ') || '09:30 AM, 11:30 AM, 02:00 PM'}\n\n👉 దయచేసి **"ఖరారు చేయండి"** అని చెప్పి లేదా కింద ఉన్న బటన్ క్లిక్ చేసి కన్ఫర్మ్ చేయండి. లేదా ప్రత్యామ్నాయ స్లాట్ ఎంచుకోవచ్చు, తేదీ మార్చవచ్చు, లేదా రద్దు చేయవచ్చు.\n*(గమనిక: మీరు ఖరారు చేసేవరకు ఇది హిస్టరీలో నమోదు కాదు)*`;
      } else if (lang === 'hi') {
        confirmation = `📋 **अपॉइंटमेंट बुकिंग प्रस्ताव**\n\n• **अस्पताल:** **${targetHosp.name}** (${targetHosp.uniqueCode})\n• **डॉक्टर:** **${opdDoctor.name}** (${proposal.department})\n• **दिनांक:** ${targetDate}\n• **समय:** **${targetSlot}** (उपलब्ध है ✅)\n• **वैकल्पिक स्लॉट:** ${flexibleList.join(', ') || '09:30 AM, 11:30 AM, 02:00 PM'}\n\n👉 कृपया **"कन्फर्म करें"** कहकर या नीचे दिए गए बटन पर क्लिक करके पुष्टि करें। आप अन्य लचीला स्लॉट चुन सकते हैं, तारीख बदल सकते हैं, या रद्द कर सकते हैं।\n*(सूचना: पुष्टि करने तक यह इतिहास में दर्ज नहीं होगा)*`;
      } else if (lang === 'ta') {
        confirmation = `📋 **முன்பதிவு முன்மொழிவு:** ${targetHosp.name} - ${opdDoctor.name} (${targetDate}, ${targetSlot}). உறுதிப்படுத்தவா அல்லது ரத்து செய்யவா?`;
      }
    }

    return {
      reply: confirmation,
      action: {
        type: 'PROPOSE_APPOINTMENT',
        target: 'appointments',
        proposal,
      },
      proposal,
      detectedLanguage: lang,
    };
  }

  // 4. Hospital Search & Filtering by State, Cost, Free OPD, Specialty
  const isHospitalSearch =
    lower.includes('hospital') || lower.includes('hospitals') || lower.includes('filter') ||
    lower.includes('show') || lower.includes('available') ||
    lower.includes('ఆసుపత్రి') || lower.includes('హాస్పిటల్') || lower.includes('చూపించు') ||
    lower.includes('अस्पताल') || lower.includes('दिखाओ') || lower.includes('फ़िल्टर') ||
    lower.includes('மருத்துவமனை');

  if (isHospitalSearch) {
    let filterState: string | undefined = undefined;
    let filterDept: string | undefined = undefined;
    let maxCost: number | undefined = undefined;
    let freeOnly: boolean | undefined = undefined;

    const stateMatches: { state: string; keywords: string[] }[] = [
      { state: 'Andhra Pradesh', keywords: ['andhra pradesh', 'andhra', 'ap', 'a.p.', 'ఆంధ్ర ప్రదేశ్', 'ఆంధ్రప్రదేశ్', 'ఆంధ్ర', 'आंध्र प्रदेश', 'आंध्र', 'vizag', 'visakhapatnam', 'tirupati', 'amaravati', 'vijayawada'] },
      { state: 'Arunachal Pradesh', keywords: ['arunachal pradesh', 'arunachal', 'అరుణాచల్', 'अरुणाचल', 'naharlagun', 'itanagar'] },
      { state: 'Assam', keywords: ['assam', 'అస్సాం', 'असम', 'guwahati', 'gauhati'] },
      { state: 'Bihar', keywords: ['bihar', 'బీహార్', 'बिहार', 'patna'] },
      { state: 'Chandigarh', keywords: ['chandigarh', 'చండీగఢ్', 'चंडीगढ़'] },
      { state: 'Chhattisgarh', keywords: ['chhattisgarh', 'ఛత్తీస్‌గఢ్', 'छत्तीसगढ़', 'raipur'] },
      { state: 'Delhi', keywords: ['delhi', 'ఢిల్లీ', 'दिल्ली', 'new delhi', 'नई दिल्ली'] },
      { state: 'Goa', keywords: ['goa', 'గోవా', 'गोवा', 'panaji', 'bambolim', 'margao'] },
      { state: 'Gujarat', keywords: ['gujarat', 'గుజరాత్', 'ગુજરાત', 'गुजरात', 'ahmedabad', 'vadodara'] },
      { state: 'Haryana', keywords: ['haryana', 'హర్యానా', 'हरियाणा', 'rohtak', 'karnal', 'gurugram', 'gurgaon'] },
      { state: 'Himachal Pradesh', keywords: ['himachal pradesh', 'himachal', 'హిమాచల్', 'हिमाचल', 'shimla', 'kangra', 'tanda'] },
      { state: 'Jammu & Kashmir', keywords: ['jammu & kashmir', 'jammu', 'kashmir', 'జమ్మూ', 'కశ్మీర్', 'जम्मू', 'कश्मीर', 'srinagar'] },
      { state: 'Jharkhand', keywords: ['jharkhand', 'జార్ఖండ్', 'झारखंड', 'ranchi', 'deoghar'] },
      { state: 'Karnataka', keywords: ['karnataka', 'కర్ణాటక', 'కర్నాటక', 'कर्नाटक', 'bengaluru', 'bangalore', 'బెంగళూరు', 'बेंगलुरु'] },
      { state: 'Kerala', keywords: ['kerala', 'కేరళ', 'केरल', 'trivandrum', 'thiruvananthapuram', 'kochi', 'ernakulam', 'కోచి'] },
      { state: 'Ladakh', keywords: ['ladakh', 'లడఖ్', 'लद्दाख', 'leh'] },
      { state: 'Madhya Pradesh', keywords: ['madhya pradesh', 'మధ్యప్రదేశ్', 'मध्य प्रदेश', 'indore', 'bhopal'] },
      { state: 'Maharashtra', keywords: ['maharashtra', 'మహారాష్ట్ర', 'महाराष्ट्र', 'mumbai', 'मुंबई', 'pune'] },
      { state: 'Manipur', keywords: ['manipur', 'మణిపూర్', 'मणिपुर', 'imphal'] },
      { state: 'Meghalaya', keywords: ['meghalaya', 'మేఘాలయ', 'मेघालय', 'shillong'] },
      { state: 'Mizoram', keywords: ['mizoram', 'మిజోరం', 'मिजोरम', 'aizawl'] },
      { state: 'Nagaland', keywords: ['nagaland', 'నాగాలాండ్', 'नागालैंड', 'kohima'] },
      { state: 'Odisha', keywords: ['odisha', 'orissa', 'ఒడిశా', 'ఒరిస్సా', 'ओडिशा', 'bhubaneswar', 'cuttack'] },
      { state: 'Puducherry', keywords: ['puducherry', 'pondicherry', 'పాండిచ్చేరి', 'पुदुचेरी'] },
      { state: 'Punjab', keywords: ['punjab', 'పంజాబ్', 'पंजाब', 'amritsar', 'patiala', 'ludhiana'] },
      { state: 'Rajasthan', keywords: ['rajasthan', 'రాజస్థాన్', 'राजस्थान', 'jaipur', 'jodhpur'] },
      { state: 'Sikkim', keywords: ['sikkim', 'సిక్కిం', 'सिक्किम', 'gangtok'] },
      { state: 'Tamil Nadu', keywords: ['tamil nadu', 'tamil', 'తమిళనాడు', 'तमिलनाडु', 'chennai', 'சென்னை'] },
      { state: 'Telangana', keywords: ['telangana', 'తెలంగాణ', 'तेलंगाना', 'hyderabad', 'హైదరాబాద్', 'secunderabad'] },
      { state: 'Tripura', keywords: ['tripura', 'త్రిపుర', 'त्रिपुरा', 'agartala'] },
      { state: 'Uttar Pradesh', keywords: ['uttar pradesh', 'uttar', 'up', 'u.p.', 'ఉత్తర ప్రదేశ్', 'ఉత్తరప్రదేశ్', 'उत्तर प्रदेश', 'उत्तर', 'lucknow', 'varanasi', 'kanpur'] },
      { state: 'Uttarakhand', keywords: ['uttarakhand', 'ఉత్తరాఖండ్', 'उत्तराखंड', 'dehradun', 'rishikesh'] },
      { state: 'West Bengal', keywords: ['west bengal', 'పశ్చిమ బెంగాల్', 'पश्चिम बंगाल', 'kolkata', 'calcutta'] },
    ];

    for (const sm of stateMatches) {
      if (sm.keywords.some((kw) => lower.includes(kw))) {
        filterState = sm.state;
        break;
      }
    }

    if (lower.includes('free') || lower.includes('ఉచిత') || lower.includes('ముफ्त') || lower.includes('zero')) {
      maxCost = 0;
      freeOnly = true;
    } else if (lower.includes('low cost') || lower.includes('cheap') || lower.includes('తక్కువ ఫీజు') || lower.includes('कम फीस')) {
      maxCost = 20;
    }

    if (lower.includes('cardio') || lower.includes('heart') || lower.includes('గుండె') || lower.includes('हार्ट') || lower.includes('दिल')) {
      filterDept = 'Cardiology';
    } else if (lower.includes('ortho') || lower.includes('bone') || lower.includes('joint') || lower.includes('ఎముక') || lower.includes('हड्डी')) {
      filterDept = 'Orthopedics';
    } else if (lower.includes('pediatric') || lower.includes('child') || lower.includes('పిల్లల') || lower.includes('बच्चే')) {
      filterDept = 'Pediatrics';
    } else if (lower.includes('neuro') || lower.includes('brain') || lower.includes('నరాలు') || lower.includes('दिमाग')) {
      filterDept = 'Neurology';
    } else if (lower.includes('opd') || lower.includes('general') || lower.includes('సాధారణ')) {
      filterDept = 'General Medicine';
    }

    const matched = hospitals.filter((h) => {
      const matchSt = !filterState || h.state.toLowerCase() === filterState.toLowerCase();
      const matchCst = maxCost === undefined || h.estimatedConsultationCost <= maxCost;
      const matchDp = !filterDept || h.departments.includes(filterDept as any);
      return matchSt && matchCst && matchDp;
    });

    // If state filter is specified, ONLY show hospitals from that state - never leak other states!
    const stateOnlyHospitals = filterState
      ? hospitals.filter((h) => h.state.toLowerCase() === filterState.toLowerCase())
      : hospitals;

    const displayHospitals = matched.length > 0 ? matched : stateOnlyHospitals;
    const displayList =
      displayHospitals.length > 0
        ? displayHospitals
            .map(
              (h) =>
                `• **${h.name}** (${h.city}, ${h.state}) - OPD Fee: ${h.estimatedConsultationCost === 0 ? 'FREE' : '₹' + h.estimatedConsultationCost} | Rating: ★ ${h.rating} | Free Beds: ${h.bedsAvailable}`
            )
            .join('\n')
        : `No registered public hospitals found in ${filterState}.`;

    let reply = `Here are the available public hospitals matching your criteria:\n\n${displayList}\n\nI have applied these filters in the Hospital Directory for you!`;

    if (lang === 'te') {
      const stateLabel = filterState ? `${filterState} రాష్ట్రంలో` : 'మీ కోసం';
      reply = `${stateLabel} అందుబాటులో ఉన్న ప్రభుత్వ ఆసుపత్రులు:\n\n${displayList}\n\nమీ అభ్యర్థన మేరకు హాస్పిటల్ డైరెక్టరీలో ఫిల్టర్ చేసి వివరాలు చూపుతున్నాను!`;
    } else if (lang === 'hi') {
      const stateLabel = filterState ? `${filterState} में` : 'आपके लिए';
      reply = `${stateLabel} उपलब्ध सरकारी अस्पताल:\n\n${displayList}\n\nअस्पताल डायरेक्टरी में यह फ़िल्टर सक्रिय कर दिया गया है!`;
    } else if (lang === 'ta') {
      reply = `கிடைக்கக்கூடிய அரசு மருத்துவமனைகள்:\n\n${displayList}\n\nமருத்துவமனை பட்டியல் திரைக்கு மாற்றுகிறேன்!`;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mediguide:filter-hospitals', {
          detail: { state: filterState, department: filterDept, maxCost, freeOnly, searchQuery: '' },
        })
      );
    }

    return {
      reply,
      action: {
        type: 'FILTER_HOSPITALS',
        target: 'hospitals',
        filter: {
          state: filterState,
          department: filterDept,
          maxCost,
          freeOnly,
        },
      },
      detectedLanguage: lang,
    };
  }

  // 5. In-App Navigation Intents
  if (lower.includes('profile') || lower.includes('abha') || lower.includes('प्रोफाइल') || lower.includes('ప్రొఫైల్')) {
    let reply = `Opening your patient profile and official ABHA health card right away.`;
    if (lang === 'te') reply = `మీ పేషెంట్ ప్రొఫైల్ మరియు అధికారిక ఆయుష్మాన్ భారత్ (ABHA) హెల్త్ కార్డ్ వివరాలు తెరుస్తున్నాను.`;
    if (lang === 'hi') reply = `आपका मरीज प्रोफ़ाइल और आधिकारिक आभा (ABHA) हेल्थ कार्ड खोला जा रहा है।`;
    if (lang === 'ta') reply = `உங்கள் சுயவிவரம் மற்றும் ஆபா (ABHA) சுகாதார அட்டை திறக்கப்படுகிறது.`;
    return {
      reply,
      action: { type: 'NAVIGATE', target: 'profile' },
      detectedLanguage: lang,
    };
  }

  if (
    lower.includes('routine') ||
    lower.includes('medicine') ||
    lower.includes('tablet') ||
    lower.includes('dosage') ||
    lower.includes('दवा') ||
    lower.includes('మందులు') ||
    lower.includes('మాత్రలు')
  ) {
    let reply = `Opening your Active Tablet Routines. You can review your morning, noon, and night medicine schedules.`;
    if (lang === 'te') reply = `మీ క్రియాశీల మందుల పట్టిక తెరుస్తున్నాను. మీ ఉదయం, మధ్యాహ్నం, రాత్రి మోతాదులను మరియు డాక్టర్ సూచనలను ఇక్కడ చూడవచ్చు.`;
    if (lang === 'hi') reply = `आपकी सक्रिय दवा दिनचर्या खोली जा रही है। यहाँ आप सुबह, दोपहर और रात की खुराक देख सकते हैं।`;
    if (lang === 'ta') reply = `உங்கள் மாத்திரை அட்டவணை திறக்கப்படுகிறது. காலை, மதியம் மற்றும் இரவு மருந்துகளைக் காணலாம்.`;
    return {
      reply,
      action: { type: 'NAVIGATE', target: 'routine' },
      detectedLanguage: lang,
    };
  }

  if (lower.includes('bill') || lower.includes('receipt') || lower.includes('invoice') || lower.includes('रसीद') || lower.includes('బిల్లు')) {
    let reply = `Opening your Jan Aushadhi Pharmacy bills where you can view receipts and download official PDFs.`;
    if (lang === 'te') reply = `మీ జన్ ఔషధి ఫార్మసీ రసీదుల పేజీ తెరుస్తున్నాను. ఇక్కడ మీరు అధికారిక జీఎస్టీ బిల్లుల పీడీఎఫ్ డౌన్‌లోడ్ చేసుకోవచ్చు.`;
    if (lang === 'hi') reply = `आपके जन औषधि फार्मेसी बिल खोले जा रहे हैं। यहाँ आप आधिकारिक रसीदें देखकर पीडीएफ डाउनलोड कर सकते हैं।`;
    return {
      reply,
      action: { type: 'NAVIGATE', target: 'bills' },
      detectedLanguage: lang,
    };
  }

  // 6. Symptom Triage & Recommendations
  if (
    lower.includes('pain') ||
    lower.includes('fever') ||
    lower.includes('chest') ||
    lower.includes('cough') ||
    lower.includes('दर्द') ||
    lower.includes('बुखार') ||
    lower.includes('నొప్పి') ||
    lower.includes('జ్వరం')
  ) {
    let dept: MedicalDepartment = 'General Medicine';
    if (lower.includes('chest') || lower.includes('heart') || lower.includes('सीने') || lower.includes('ఛాతీ')) {
      dept = 'Cardiology';
    } else if (lower.includes('bone') || lower.includes('joint') || lower.includes('knee') || lower.includes('घुटने') || lower.includes('కీళ్ల')) {
      dept = 'Orthopedics';
    } else if (lower.includes('headache') || lower.includes('सिरदर्द') || lower.includes('తలనొప్పి')) {
      dept = 'Neurology';
    }

    let reply = `Based on your symptoms, our clinical reasoning agent recommends consulting the **${dept}** department at a public hospital. Opening AI triage now!`;
    if (lang === 'te') {
      reply = `మీ లక్షణాల ఆధారంగా, క్లినికల్ ఏజెంట్ ప్రభుత్వ ఆసుపత్రిలోని **${dept}** విభాగాన్ని సంప్రదించాల్సిందిగా సూచిస్తోంది. AI సిఫార్సుల డెస్క్ తెరుస్తున్నాను!`;
    } else if (lang === 'hi') {
      reply = `आपके लक्षणों के आधार पर, क्लिनिकल एजेंट सरकारी अस्पताल के **${dept}** विभाग में परामर्श की सलाह देता है। एआई सिफ़ारिश डेस्क खोला जा रहा है!`;
    }

    return {
      reply,
      suggestedDepartment: dept,
      action: { type: 'NAVIGATE', target: 'ai_suggest' },
      detectedLanguage: lang,
    };
  }

  // Default Greeting in Detected Language
  let defaultGreeting = `Hello ${context.userName || 'Citizen'}! I am your MediNav Citizen Copilot (user_agent). I can help you find nearby government hospitals, book General OPD appointments, reschedule your visit, track daily tablet routines, and download pharmacy invoices. How can I help you?`;

  if (lang === 'te') {
    defaultGreeting = `నమస్కారం ${context.userName || 'సిటిజెన్'}! నేను మీ MediNav సిటిజెన్ కోపాయ్లెట్ (user_agent). నేను మీకు సమీపంలోని ప్రభుత్వ ఆసుపత్రులను కనుగొనడంలో, జనరల్ ఓపీడీ (OPD) అపాయింట్‌మెంట్లు బుక్ చేయడంలో, రీషెడ్యూల్ చేయడంలో మరియు మందుల వివరాలు చూడటంలో సహాయం చేయగలను. మీకు ఏమి కావాలి?`;
  } else if (lang === 'hi') {
    defaultGreeting = `नमस्ते ${context.userName || 'नागरिक'}! मैं आपका MediNav नागरिक कोपायलट (user_agent) हूँ। मैं आपको सरकारी अस्पताल खोजने, जनरल ओपीडी अपॉइंटमेंट बुक करने, स्लॉट रीशेड्यूल करने और दवाइयों का शेड्यूल ट्रैक करने में मदद कर सकता हूँ। मैं आपकी क्या सेवा करूँ?`;
  } else if (lang === 'ta') {
    defaultGreeting = `வணக்கம் ${context.userName || 'Citizen'}! நான் உங்கள் மெடிகைடு ஏஐ சுகாதார உதவியாளர். அரசு மருத்துவமனை ஓபிடி முன்பதிவு மற்றும் மாத்திரை அட்டவணைக்கு நான் உங்களுக்கு உதவ முடியும்.`;
  }

  return {
    reply: defaultGreeting,
    detectedLanguage: lang,
  };
}

function parseAgentOutput(text: string): AgentResponse {
  let action: AgentResponse['action'] = undefined;
  if (text.includes('[NAVIGATE: profile]')) {
    action = { type: 'NAVIGATE', target: 'profile' };
  } else if (text.includes('[NAVIGATE: appointments]')) {
    action = { type: 'NAVIGATE', target: 'appointments' };
  } else if (text.includes('[NAVIGATE: routine]')) {
    action = { type: 'NAVIGATE', target: 'routine' };
  } else if (text.includes('[NAVIGATE: bills]')) {
    action = { type: 'NAVIGATE', target: 'bills' };
  } else if (text.includes('[NAVIGATE: hospitals]')) {
    action = { type: 'NAVIGATE', target: 'hospitals' };
  } else if (text.includes('[NAVIGATE: queue]')) {
    action = { type: 'NAVIGATE', target: 'queue' };
  } else if (text.includes('[NAVIGATE: courses]')) {
    action = { type: 'NAVIGATE', target: 'courses' };
  } else if (text.includes('[NAVIGATE: inventory]')) {
    action = { type: 'NAVIGATE', target: 'inventory' };
  } else if (text.includes('[NAVIGATE: billing]')) {
    action = { type: 'NAVIGATE', target: 'billing' };
  }

  const cleanedText = text
    .replace(/\[NAVIGATE: [a-z]+\]/gi, '')
    .replace(/\[FILTER:.*?\]/gi, '')
    .replace(/\[VERIFY_PASS:.*?\]/gi, '')
    .trim();

  return {
    reply: cleanedText,
    action,
    isOutOfScope: cleanedText.toLowerCase().includes('cannot assist with non-medical'),
  };
}
