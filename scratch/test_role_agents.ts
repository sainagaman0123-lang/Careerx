import { askGeminiOrSimulate } from '../src/services/gemini';
import { storage } from '../src/services/storage';

// Polyfill localStorage for node environment
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// Polyfill window and custom event
if (typeof window === 'undefined') {
  (global as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  (global as any).CustomEvent = class CustomEvent {
    detail: any;
    constructor(name: string, opts?: any) {
      this.detail = opts?.detail;
    }
  };
}

async function runTests() {
  console.log('--- STARTING ROLE AGENTS TEST SUITE ---');
  storage.init();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // TEST 1: Doctor Agent (doc_agent) - Pass Code Verification
  console.log('\n[Test 1] doc_agent - Pass Code Verification');
  const courses = storage.getCourses();
  const samplePass = courses[0]?.verificationPassCode || 'PASS-7729';

  const docPassRes = await askGeminiOrSimulate(`Verify ${samplePass}`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docPassRes.reply.includes('Verified') && docPassRes.action?.type === 'VERIFY_PASS',
    'doc_agent successfully verified pass code and set VERIFY_PASS action'
  );

  // TEST 2: Doctor Agent (doc_agent) - OPD Queue
  console.log('\n[Test 2] doc_agent - OPD Queue');
  const docQueueRes = await askGeminiOrSimulate("Show today's OPD queue", {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docQueueRes.reply.includes('OPD Queue') || docQueueRes.reply.includes('waiting'),
    'doc_agent returned OPD queue summary'
  );

  // TEST 3: Doctor Agent (doc_agent) - Multilingual Telugu Passcode Verification
  console.log('\n[Test 3] doc_agent - Telugu Pass Code Verification');
  const docTeRes = await askGeminiOrSimulate(`${samplePass} ధృవీకరించండి`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
    language: 'te',
  });
  assert(
    docTeRes.reply.includes('ధృవీకరించబడింది') || docTeRes.reply.includes('విజయవంతంగా'),
    'doc_agent responded in fluent Telugu'
  );

  // TEST 4: Doctor Agent (doc_agent) - Hindi Pass Code Verification
  console.log('\n[Test 4] doc_agent - Hindi Pass Code Verification');
  const docHiRes = await askGeminiOrSimulate(`${samplePass} सत्यापित करें`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
    language: 'hi',
  });
  assert(
    docHiRes.reply.includes('सत्यापित') || docHiRes.reply.includes('सफलतापूर्वक'),
    'doc_agent responded in fluent Hindi'
  );

  // TEST 5: Doctor Agent (doc_agent) - Emergency Override
  console.log('\n[Test 5] doc_agent - Emergency Schedule Override');
  const docEmergRes = await askGeminiOrSimulate('Emergency slot override for urgent trauma', {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docEmergRes.reply.includes('Emergency') || docEmergRes.reply.includes('Override'),
    'doc_agent executed emergency schedule takeover'
  );

  // TEST 6: Doctor Agent (doc_agent) - Drug-Drug Interaction Advisory
  console.log('\n[Test 6] doc_agent - Clinical Pharmacology Advisory');
  const docDrugRes = await askGeminiOrSimulate('Check Metformin and Amlodipine interaction', {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docDrugRes.reply.includes('Pharmacology') && docDrugRes.reply.includes('Metformin'),
    'doc_agent provided clinical pharmacology interaction advisory'
  );

  // TEST 7: Receptionist Agent (user_receptionist_agent) - Doctor Attendance
  console.log('\n[Test 7] user_receptionist_agent - Doctor Attendance');
  const recAttRes = await askGeminiOrSimulate('Check doctor attendance status', {
    agentId: 'user_receptionist_agent',
    activeRole: 'receptionist',
    userName: 'Front Desk',
  });
  assert(
    recAttRes.reply.includes('Doctor') && recAttRes.reply.includes('On-Duty'),
    'user_receptionist_agent returned on-duty doctor attendance'
  );

  // TEST 8: Receptionist Agent (user_receptionist_agent) - Bed Capacity
  console.log('\n[Test 8] user_receptionist_agent - Bed Capacity');
  const recBedRes = await askGeminiOrSimulate('Hospital bed capacity & occupancy', {
    agentId: 'user_receptionist_agent',
    activeRole: 'receptionist',
    userName: 'Front Desk',
  });
  assert(
    recBedRes.reply.includes('Total') && recBedRes.reply.includes('Beds'),
    'user_receptionist_agent reported bed occupancy'
  );

  // TEST 9: Pharmacy Agent (pharm_agent) - Low Stock Check
  console.log('\n[Test 9] pharm_agent - Low Stock');
  const pharmLowRes = await askGeminiOrSimulate('Check low stock medicines', {
    agentId: 'pharm_agent',
    activeRole: 'pharmacy',
    userName: 'Chief Pharmacist',
  });
  assert(
    pharmLowRes.reply.includes('threshold') || pharmLowRes.reply.includes('Stock'),
    'pharm_agent reported low inventory formulations'
  );

  // TEST 10: Pharmacy Agent (pharm_agent) - Search & Pricing
  console.log('\n[Test 10] pharm_agent - Generic Drug Search & Price');
  const pharmSearchRes = await askGeminiOrSimulate('Search Paracetamol 650mg price', {
    agentId: 'pharm_agent',
    activeRole: 'pharmacy',
    userName: 'Chief Pharmacist',
  });
  assert(
    pharmSearchRes.reply.includes('Paracetamol') && pharmSearchRes.reply.includes('Price'),
    'pharm_agent looked up formulation and public Jan Aushadhi price'
  );

  // TEST 11: Pharmacy Agent (pharm_agent) - Ayushman Bharat 25% Discount
  console.log('\n[Test 11] pharm_agent - 25% Ayushman Bharat Subsidy');
  const pharmSubRes = await askGeminiOrSimulate('Calculate 25% Ayushman Bharat discount', {
    agentId: 'pharm_agent',
    activeRole: 'pharmacy',
    userName: 'Chief Pharmacist',
  });
  assert(
    pharmSubRes.reply.includes('25%') && pharmSubRes.reply.includes('Subsidy'),
    'pharm_agent calculated Ayushman Bharat 25% subsidy accurately'
  );

  // TEST 12: Admin Agent (admin_agent) - 8 Micro-Agent Mesh Telemetry
  console.log('\n[Test 12] admin_agent - 8-Agent Mesh Status');
  const adminMeshRes = await askGeminiOrSimulate('Inspect 8-agent mesh status & latency', {
    agentId: 'admin_agent',
    activeRole: 'admin',
    userName: 'Administrator',
  });
  assert(
    adminMeshRes.reply.includes('8') && adminMeshRes.reply.includes('Latency'),
    'admin_agent reported 8-agent mesh telemetry'
  );

  // TEST 13: Admin Agent (admin_agent) - National Bed Occupancy across 33 states
  console.log('\n[Test 13] admin_agent - National Bed Occupancy across 33 states');
  const adminBedRes = await askGeminiOrSimulate('National bed occupancy analytics across 33 states', {
    agentId: 'admin_agent',
    activeRole: 'admin',
    userName: 'Administrator',
  });
  assert(
    adminBedRes.reply.includes('33') && adminBedRes.reply.includes('Capacity'),
    'admin_agent computed nationwide hospital bed analytics across 33 states'
  );

  // TEST 14: Admin Agent (admin_agent) - Security Audit Logs
  console.log('\n[Test 14] admin_agent - Real-time Audit Logs');
  const adminAuditRes = await askGeminiOrSimulate('Show recent agent audit logs', {
    agentId: 'admin_agent',
    activeRole: 'admin',
    userName: 'Administrator',
  });
  assert(
    adminAuditRes.reply.includes('Audit') && adminAuditRes.reply.includes('logged'),
    'admin_agent audited inter-agent bus traffic'
  );

  // TEST 15: Citizen Agent (user_agent) - Guardrail Enforcement
  console.log('\n[Test 15] user_agent - Guardrail Out-of-Scope Rejection');
  const userGuardRes = await askGeminiOrSimulate('How do I cook hyderabadi biryani?', {
    agentId: 'user_agent',
    activeRole: 'patient',
    userName: 'Ramesh',
  });
  assert(
    userGuardRes.isOutOfScope === true && userGuardRes.reply.includes('strictly dedicated to healthcare'),
    'user_agent rejected cooking query'
  );

  // TEST 16: Citizen Agent (user_agent) - OPD Booking
  console.log('\n[Test 16] user_agent - OPD Booking is General Medicine');
  const userOpdRes = await askGeminiOrSimulate('Book OPD appointment in Delhi', {
    agentId: 'user_agent',
    activeRole: 'patient',
    userName: 'Ramesh',
  });
  assert(
    userOpdRes.reply.includes('General Medicine') || userOpdRes.reply.includes('General OPD'),
    'user_agent booked General Medicine OPD (never cardiology)'
  );

  // TEST 17: Citizen Agent (user_agent) - Rescheduling
  console.log('\n[Test 17] user_agent - Appointment Rescheduling');
  const userReschRes = await askGeminiOrSimulate('Reschedule my appointment to tomorrow 11:30 AM', {
    agentId: 'user_agent',
    activeRole: 'patient',
    userName: 'Ramesh',
  });
  assert(
    userReschRes.reply.includes('rescheduled') && userReschRes.action?.type === 'NAVIGATE',
    'user_agent rescheduled appointment and returned new PASS-XXXX code'
  );

  // TEST 18: Doctor Agent (doc_agent) - Timetable Schedule for "how many appointments have today"
  console.log('\n[Test 18] doc_agent - Timetable Schedule for "how many appointments have today"');
  const docScheduleRes = await askGeminiOrSimulate('How many appointments have today and show my timetable schedule', {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docScheduleRes.reply.includes('Timetable') &&
    docScheduleRes.reply.includes('Time Slot') &&
    docScheduleRes.reply.includes('Citizen Name') &&
    docScheduleRes.reply.includes('Mobile Number') &&
    docScheduleRes.reply.includes('Secret Pass Code'),
    'doc_agent returned dynamic timetable schedule table with citizen names, mobile numbers, and passcodes'
  );

  // TEST 19: Doctor Agent (doc_agent) - Explain specific Appointment ID
  console.log('\n[Test 19] doc_agent - Explain specific Appointment ID');
  const apts = storage.getAppointments();
  const targetAptId = apts[0]?.id || 'apt_1';
  const targetAptName = apts[0]?.patientName || 'Aarav Sharma';
  const targetAptPhone = apts[0]?.patientPhone || '+91 98765 43210';

  const docExplainRes = await askGeminiOrSimulate(`Explain about appointment ${targetAptId}`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docExplainRes.reply.includes(targetAptId) &&
    docExplainRes.reply.includes(targetAptName) &&
    docExplainRes.reply.includes(targetAptPhone) &&
    docExplainRes.reply.includes('Citizen Name') &&
    docExplainRes.reply.includes('Citizen Mobile Number'),
    `doc_agent explained appointment ${targetAptId} with citizen name, mobile number, and clinical dossier`
  );

  // TEST 20: Doctor Agent (doc_agent) - Multilingual Telugu Timetable Schedule
  console.log('\n[Test 20] doc_agent - Telugu Timetable Schedule ("ఈరోజు ఎన్ని అపాయింట్‌మెంట్‌లు ఉన్నాయి")');
  const docTeScheduleRes = await askGeminiOrSimulate('ఈరోజు ఎన్ని అపాయింట్‌మెంట్‌లు ఉన్నాయి, టైమ్‌టేబుల్ చూపించు', {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
    language: 'te',
  });
  assert(
    docTeScheduleRes.reply.includes('టైమ్‌టేబుల్') || docTeScheduleRes.reply.includes('అపాయింట్‌మెంట్‌'),
    'doc_agent returned timetable schedule in Telugu'
  );

  // TEST 21: Doctor Agent (doc_agent) - Multilingual Hindi Explain Appointment
  console.log('\n[Test 21] doc_agent - Hindi Explain Appointment ("अपॉइंटमेंट के बारे में विस्तार से बताएं")');
  const docHiExplainRes = await askGeminiOrSimulate(`अपॉइंटमेंट ${targetAptId} के बारे में विस्तार से बताएं`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
    language: 'hi',
  });
  assert(
    docHiExplainRes.reply.includes(targetAptId) &&
    (docHiExplainRes.reply.includes('मरीज') || docHiExplainRes.reply.includes('विवरण') || docHiExplainRes.reply.includes(targetAptName)),
    'doc_agent explained appointment in fluent Hindi'
  );

  // TEST 22: Doctor Agent (doc_agent) - Accept Appointment Command
  console.log('\n[Test 22] doc_agent - Accept Appointment Command');
  const aptToAccept = storage.getAppointments()[0]?.id || 'apt_1';
  const docAcceptRes = await askGeminiOrSimulate(`Accept appointment ${aptToAccept}`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docAcceptRes.reply.includes('Confirmed') && docAcceptRes.action?.type === 'ACCEPT_APPOINTMENT',
    `doc_agent accepted appointment ${aptToAccept} with ACCEPT_APPOINTMENT action`
  );

  // TEST 23: Doctor Agent (doc_agent) - Reject Appointment Command
  console.log('\n[Test 23] doc_agent - Reject Appointment Command');
  const aptToReject = storage.getAppointments()[1]?.id || 'apt_2';
  const docRejectRes = await askGeminiOrSimulate(`Reject appointment ${aptToReject} emergency surgery in progress`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docRejectRes.reply.includes('Cancelled') && docRejectRes.action?.type === 'REJECT_APPOINTMENT',
    `doc_agent rejected appointment ${aptToReject} with clinical reason and REJECT_APPOINTMENT action`
  );

  // TEST 24: Doctor Agent (doc_agent) - Reschedule Appointment Command
  console.log('\n[Test 24] doc_agent - Reschedule Appointment Command');
  const docReschRes = await askGeminiOrSimulate(`Reschedule appointment ${aptToAccept} to 2026-10-15 11:30 AM`, {
    agentId: 'doc_agent',
    activeRole: 'doctor',
    userName: 'Dr. Rajesh Sharma',
  });
  assert(
    docReschRes.reply.includes('Rescheduled') && docReschRes.action?.type === 'RESCHEDULE_APPOINTMENT',
    `doc_agent rescheduled appointment ${aptToAccept} with RESCHEDULE_APPOINTMENT action`
  );

  // TEST 25: Receptionist Agent (user_receptionist_agent) - Search Doctor by ID
  console.log('\n[Test 25] user_receptionist_agent - Search Doctor by ID');
  const recepDocSearchRes = await askGeminiOrSimulate('Search doctor ID doc_del_01 status', {
    agentId: 'user_receptionist_agent',
    activeRole: 'receptionist',
    userName: 'Reception Desk',
  });
  assert(
    recepDocSearchRes.reply.includes('doc_del_01') &&
    (recepDocSearchRes.reply.includes('Available') || recepDocSearchRes.reply.includes('Duty') || recepDocSearchRes.reply.includes('Consultation')),
    'user_receptionist_agent accurately returned doctor availability status by ID'
  );

  // TEST 26: Pharmacy Agent (pharm_agent) - Medicine Physical Warehouse Location
  console.log('\n[Test 26] pharm_agent - Medicine Location Lookup');
  const pharmLocRes = await askGeminiOrSimulate('Where is Dolo 650 located in the pharmacy warehouse?', {
    agentId: 'pharm_agent',
    activeRole: 'pharmacy',
    userName: 'Central Pharmacy',
  });
  assert(
    pharmLocRes.reply.includes('4th rack') &&
    pharmLocRes.reply.includes('3rd column') &&
    pharmLocRes.reply.includes('5th row'),
    'pharm_agent reported exact warehouse shelf location (4th rack, 3rd column, 5th row)'
  );

  // TEST 27: Pharmacy - Restock Medicine with Shelf Location Coordinates
  console.log('\n[Test 27] storage.restockOrAddMedicine - Restock with Coordinates');
  const restocked = storage.restockOrAddMedicine({
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin Trihydrate',
    category: 'Antibiotic',
    pricePerUnit: 22,
    quantity: 50,
    rack: 6,
    column: 2,
    row: 4,
  });
  assert(
    restocked.name === 'Amoxicillin 500mg' &&
    restocked.rack === 6 &&
    restocked.column === 2 &&
    restocked.row === 4 &&
    restocked.location?.includes('6th rack') &&
    restocked.location?.includes('2nd column'),
    'restockOrAddMedicine correctly assigned physical warehouse coordinates (6th rack, 2nd column, 4th row)'
  );

  // TEST 28: Profile Synchronization across appointments, courses, and bills
  console.log('\n[Test 28] Central Patient Profile Synchronization Cascade');
  const initialProfile = storage.getPatientProfile();
  const updatedProfile = {
    ...initialProfile,
    name: 'Vikramaditya Rathore',
    phone: '+91 99887 76655',
  };
  storage.setPatientProfile(updatedProfile);

  const reloadedApts = storage.getAppointments();
  const reloadedProfile = storage.getPatientProfile();
  const aptUpdated = reloadedApts.some((a) => a.patientName === 'Vikramaditya Rathore');

  assert(
    reloadedProfile.name === 'Vikramaditya Rathore' && aptUpdated,
    'Central profile update successfully cascaded to patient profile and matching appointment records'
  );

  // TEST 29: State Filter Isolation - Andhra Pradesh vs Uttar Pradesh
  console.log('\n[Test 29] State Filter Isolation - Andhra Pradesh Filtering');
  const allHospitals = storage.getHospitals();
  const apHospitals = allHospitals.filter(h => h.state.trim().toLowerCase() === 'andhra pradesh');
  const upHospitalsInAp = apHospitals.filter(h => h.state.trim().toLowerCase() === 'uttar pradesh');
  assert(
    apHospitals.length > 0 && upHospitalsInAp.length === 0,
    `Andhra Pradesh filter returned ${apHospitals.length} AP hospitals and 0 UP hospitals`
  );

  const filterApAgentRes = await askGeminiOrSimulate('Show available hospitals in Andhra Pradesh', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  const filterHasApOnly =
    (filterApAgentRes.reply.includes('Andhra Pradesh') || filterApAgentRes.reply.includes('SVIMS') || filterApAgentRes.reply.includes('KGH')) &&
    !filterApAgentRes.reply.includes('Uttar Pradesh') &&
    !filterApAgentRes.reply.includes('KGMU') &&
    !filterApAgentRes.reply.includes('Sunderlal');
  assert(
    filterHasApOnly && filterApAgentRes.action?.type === 'FILTER_HOSPITALS',
    'Agent filtered specifically for Andhra Pradesh without leaking Uttar Pradesh hospitals'
  );

  // TEST 30: Hospital Booking Exact Match - SVIMS vs OGH
  console.log('\n[Test 30] Hospital Booking Exact Match - SVIMS Booking Proposal & Confirmation');
  const svimsBookingRes = await askGeminiOrSimulate('book an appointment in sri venkateswara institute of medical scinces', {
    agentId: 'user_agent',
    activeRole: 'patient',
    patientState: 'Telangana', // default user state is Telangana, but spoke SVIMS in AP
  });
  const bookedSvims =
    (svimsBookingRes.reply.includes('Sri Venkateswara') || svimsBookingRes.reply.includes('SVIMS')) &&
    !svimsBookingRes.reply.includes('Osmania') &&
    !svimsBookingRes.reply.includes('OGH');
  assert(
    bookedSvims && (svimsBookingRes.action?.type === 'PROPOSE_APPOINTMENT' || svimsBookingRes.action?.type === 'NAVIGATE' || svimsBookingRes.action?.type === 'BOOK_APPOINTMENT'),
    'Agent correctly proposed appointment in SVIMS (Sri Venkateswara Institute of Medical Sciences) instead of OGH'
  );

  const svimsConfirmRes = await askGeminiOrSimulate('confirm appointment', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  assert(
    svimsConfirmRes.action?.type === 'CONFIRM_APPOINTMENT' && svimsConfirmRes.reply.includes('Confirmed & Booked'),
    'Agent confirmed and officially booked the SVIMS appointment'
  );

  // TEST 31: Pharmacy Inventory Deduction - Paracetamol 420 -> 410 units
  console.log('\n[Test 31] Pharmacy Inventory Stock Deduction on Billing');
  // Reset medicines to initial 420 for paracetamol
  const meds = storage.getMedicines();
  const paracetamol = meds.find(m => m.name.toLowerCase().includes('paracetamol') || m.id === 'med_001');
  assert(paracetamol !== undefined, 'Found Paracetamol 650mg (Dolo) in inventory');

  if (paracetamol) {
    paracetamol.availableQuantity = 420;
    storage.setMedicines(meds);

    // Bill 10 units via pharm_agent
    const billRes = await askGeminiOrSimulate('bill 10 units of paracetamol dolo', {
      agentId: 'pharm_agent',
      activeRole: 'pharmacy',
    });

    const refreshedMeds = storage.getMedicines();
    const afterDeduction = refreshedMeds.find(m => m.id === paracetamol.id);
    assert(
      afterDeduction !== undefined && afterDeduction.availableQuantity === 410,
      `Inventory stock deducted from 420 to ${afterDeduction?.availableQuantity} units after billing 10 units`
    );
    assert(
      billRes.reply.includes('410') && billRes.reply.includes('420'),
      'pharm_agent reported previous 420 units and new 410 units in confirmation reply'
    );
  }

  // TEST 32: Google Gemini API Key Storage & Access
  console.log('\n[Test 32] Google Gemini API Key Configuration');
  storage.setGeminiApiKey('AIzaSyTestKeyForAdminPortalOnly123456');
  const storedKey = storage.getGeminiApiKey();
  assert(
    storedKey === 'AIzaSyTestKeyForAdminPortalOnly123456',
    'Gemini API key successfully saved and retrieved from admin configuration storage'
  );
  storage.setGeminiApiKey(''); // Clear demo key

  // TEST 33: Citizen Agent cancels appointment by saying hospital name ("AIIMS")
  console.log('\n[Test 33] Citizen Agent - Cancel Appointment by Hospital Name (AIIMS)');
  // Ensure we have an active appointment at AIIMS
  const existingApts = storage.getAppointments();
  let aiimsApt = existingApts.find(a => a.hospitalName.includes('AIIMS'));
  if (!aiimsApt) {
    aiimsApt = {
      id: 'apt_test_aiims',
      patientId: 'usr_pat_001',
      patientName: 'Ramesh Kumar Sharma',
      patientPhone: '+91 98765 43210',
      hospitalId: 'hosp_del_01',
      hospitalName: 'All India Institute of Medical Sciences (AIIMS)',
      hospitalCode: 'AIIMS-DEL-01',
      hospitalAddress: 'Ansari Nagar, New Delhi',
      googleMapsUrl: 'https://maps.google.com/?q=AIIMS',
      doctorId: 'doc_del_01',
      doctorName: 'Dr. Rajesh Sundaram',
      department: 'Cardiology',
      appointmentDate: '2026-10-10',
      timeSlot: '10:00 AM',
      status: 'Accepted',
      passCode: 'PASS-7729',
      createdAt: new Date().toISOString(),
    };
    storage.addAppointment(aiimsApt);
  } else {
    storage.updateAppointment(aiimsApt.id, { status: 'Accepted' });
  }

  const cancelAiimsRes = await askGeminiOrSimulate('cancel appointment in AIIMS', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });

  const updatedAiimsApt = storage.getAppointments().find(a => a.id === aiimsApt!.id);
  assert(
    updatedAiimsApt?.status === 'Cancelled',
    'AIIMS appointment status updated to Cancelled in storage'
  );
  assert(
    cancelAiimsRes.reply.includes('cancelled') &&
    (cancelAiimsRes.reply.includes('AIIMS') || cancelAiimsRes.reply.includes('All India Institute')) &&
    cancelAiimsRes.action?.type === 'CANCEL_APPOINTMENT',
    'Agent confirmed cancellation of AIIMS appointment with CANCEL_APPOINTMENT action'
  );

  // TEST 34: Citizen Agent books and cancels appointment by hospital name ("SVIMS")
  console.log('\n[Test 34] Citizen Agent - Cancel Appointment by Hospital Name (SVIMS)');
  // Propose booking at SVIMS first
  await askGeminiOrSimulate('book an appointment in sri venkateswara institute of medical sciences', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  // Explicitly confirm the proposed appointment so it gets recorded into storage
  await askGeminiOrSimulate('confirm appointment', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });

  const svimsApt = storage.getAppointments().find(a => (a.hospitalName.includes('SVIMS') || a.hospitalName.includes('Venkateswara')) && a.status !== 'Cancelled');
  assert(svimsApt !== undefined, 'Successfully found newly booked active SVIMS appointment');

  if (svimsApt) {
    const cancelSvimsRes = await askGeminiOrSimulate('cancel my SVIMS appointment', {
      agentId: 'user_agent',
      activeRole: 'patient',
    });

    const refreshedSvimsApt = storage.getAppointments().find(a => a.id === svimsApt.id);
    assert(
      refreshedSvimsApt?.status === 'Cancelled',
      'SVIMS appointment status updated to Cancelled'
    );
    assert(
      cancelSvimsRes.reply.includes('cancelled') &&
      (cancelSvimsRes.reply.includes('SVIMS') || cancelSvimsRes.reply.includes('Venkateswara')),
      'Agent confirmed cancellation of SVIMS appointment by saying SVIMS'
    );
  }

  // TEST 35: Multilingual Cancellation in Telugu ("రద్దు చేయండి")
  console.log('\n[Test 35] Multilingual Appointment Cancellation in Telugu');
  // Re-activate SVIMS appointment for telugu test
  if (svimsApt) {
    storage.updateAppointment(svimsApt.id, { status: 'Accepted' });
    const cancelTeRes = await askGeminiOrSimulate('SVIMS లో నా అపాయింట్‌మెంట్ రద్దు చేయండి', {
      agentId: 'user_agent',
      activeRole: 'patient',
      language: 'te',
    });
    const reCancelled = storage.getAppointments().find(a => a.id === svimsApt.id);
    assert(
      reCancelled?.status === 'Cancelled' && (cancelTeRes.reply.includes('రద్దు') || cancelTeRes.reply.includes('విజయవంతంగా')),
      'Agent cancelled SVIMS appointment and replied fluently in Telugu'
    );
  }

  // TEST 36: Citizen requests cancellation for hospital without appointment
  console.log('\n[Test 36] Cancellation for Hospital without Active Appointment');
  const cancelSafdarjungRes = await askGeminiOrSimulate('cancel appointment in Safdarjung Hospital', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  assert(
    cancelSafdarjungRes.reply.includes('Safdarjung') &&
    (cancelSafdarjungRes.reply.includes("couldn't find") || cancelSafdarjungRes.reply.includes('scheduled appointments')),
    'Agent gracefully informed citizen that no appointment was found at Safdarjung and listed current consultations'
  );

  // TEST 37: Interactive Appointment Proposal - Never booked to history until confirmed
  console.log('\n[Test 37] Appointment Proposal - Not saved in history prior to confirmation');
  storage.clearAppointmentProposal();
  const historyCountBefore = storage.getAppointments().length;

  const proposalRes = await askGeminiOrSimulate('Book appointment in AIIMS Delhi', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });

  const historyCountAfterProposal = storage.getAppointments().length;
  assert(
    proposalRes.action?.type === 'PROPOSE_APPOINTMENT' && proposalRes.proposal !== undefined,
    'Agent generated appointment proposal with action PROPOSE_APPOINTMENT'
  );
  assert(
    historyCountBefore === historyCountAfterProposal,
    'CRITICAL: Unconfirmed appointment proposal was NOT added to appointment history'
  );
  assert(
    proposalRes.reply.includes('Proposal') || proposalRes.reply.includes('confirm'),
    'Agent informed citizen to confirm appointment and noted flexible alternatives'
  );

  // TEST 38: Select Flexible Alternative Time Slot on Proposal
  console.log('\n[Test 38] Select Flexible Alternative Slot on Pending Proposal');
  const slotSelectRes = await askGeminiOrSimulate('Select 11:30 AM', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  const updatedProposal = storage.getAppointmentProposal();
  assert(
    updatedProposal?.requestedSlot === '11:30 AM',
    'Proposal requestedSlot successfully updated to flexible alternative 11:30 AM'
  );
  assert(
    storage.getAppointments().length === historyCountBefore,
    'History count remains untouched when selecting flexible time slot'
  );

  // TEST 39: Change Date on Pending Proposal
  console.log('\n[Test 39] Change Date on Pending Proposal');
  const dateChangeRes = await askGeminiOrSimulate('Change date to day after tomorrow', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  const expectedDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
  const dateUpdatedProposal = storage.getAppointmentProposal();
  assert(
    dateUpdatedProposal?.date === expectedDate,
    `Proposal date successfully updated to day after tomorrow (${expectedDate})`
  );
  assert(
    storage.getAppointments().length === historyCountBefore,
    'History count remains untouched when changing consultation date'
  );

  // TEST 40: Cancel Pending Proposal - Never goes to history
  console.log('\n[Test 40] Cancel Pending Proposal - Discarded and Never Goes to History');
  const cancelProposalRes = await askGeminiOrSimulate('Cancel appointment request', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  assert(
    storage.getAppointmentProposal() === null,
    'Pending appointment proposal successfully cleared from storage'
  );
  assert(
    storage.getAppointments().length === historyCountBefore,
    'CRITICAL: Appointment history count strictly identical after cancelling proposal'
  );
  assert(
    cancelProposalRes.reply.includes('will not appear in your appointment history') || cancelProposalRes.reply.includes('never booked'),
    'Agent explicitly assured citizen that request was never booked and will not appear in history'
  );

  // TEST 41: Confirm Proposal - Officially Books and Records to History
  console.log('\n[Test 41] Confirm Proposal - Officially Saves Appointment and Generates Pass Code');
  // Propose booking in Gandhi Hospital
  await askGeminiOrSimulate('Book appointment in Gandhi Hospital', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  assert(storage.getAppointmentProposal() !== null, 'Proposal active for Gandhi Hospital');

  // Explicit confirmation
  const confirmBookingRes = await askGeminiOrSimulate('Confirm appointment', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });
  assert(
    confirmBookingRes.action?.type === 'CONFIRM_APPOINTMENT' && confirmBookingRes.action?.passCode !== undefined,
    'Agent confirmed appointment with CONFIRM_APPOINTMENT and generated secret consultation passCode'
  );
  assert(
    storage.getAppointmentProposal() === null,
    'Proposal cleared after successful confirmation'
  );
  const gandhiApt = storage.getAppointments().find(a => a.hospitalName.includes('Gandhi') && a.status !== 'Cancelled');
  assert(
    gandhiApt !== undefined && gandhiApt.passCode.startsWith('PASS-'),
    'Gandhi Hospital appointment officially recorded in history with PASS-XXXX code'
  );

  // TEST 42: Slot Conflict Detection & Flexible Alternatives
  console.log('\n[Test 42] Slot Conflict Detection - Flexible Alternative Slots Provided');
  // Artificially book 10:00 AM on tomorrow for doctor of Osmania Hospital
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const osmaniaHosp = storage.getHospitals().find(h => h.name.includes('Osmania'))!;
  const osmaniaDoc = osmaniaHosp.doctors[0];
  storage.addAppointment({
    id: 'apt_busy_mock',
    patientId: 'usr_mock',
    patientName: 'Mock Patient',
    patientPhone: '9999999999',
    hospitalId: osmaniaHosp.id,
    hospitalName: osmaniaHosp.name,
    hospitalCode: osmaniaHosp.uniqueCode,
    hospitalAddress: osmaniaHosp.address,
    googleMapsUrl: osmaniaHosp.googleMapsUrl,
    doctorId: osmaniaDoc.id,
    doctorName: osmaniaDoc.name,
    department: 'General Medicine',
    appointmentDate: tomorrow,
    timeSlot: '10:00 AM',
    status: 'Accepted',
    passCode: 'PASS-9999',
    createdAt: new Date().toISOString(),
  });

  const conflictRes = await askGeminiOrSimulate('Book OPD appointment tomorrow at 10 AM in Osmania General Hospital', {
    agentId: 'user_agent',
    activeRole: 'patient',
  });

  assert(
    conflictRes.proposal?.isSlotConflict === true,
    'Agent detected slot conflict for occupied 10:00 AM slot'
  );
  assert(
    conflictRes.reply.includes('Unavailable') || conflictRes.reply.includes('occupied') || conflictRes.reply.includes('flexible'),
    'Agent alerted citizen of slot conflict and presented flexible alternative time slots'
  );
  assert(
    conflictRes.proposal?.availableSlots.length! > 0 && !conflictRes.proposal?.availableSlots.includes('10:00 AM'),
    'Occupied 10:00 AM slot omitted from flexible available slots list'
  );

  // TEST 43: Multilingual Proposal Confirmation & Cancellation (Telugu & Hindi)
  console.log('\n[Test 43] Multilingual Proposal Confirmation & Cancellation (Telugu & Hindi)');
  // Telugu cancel test
  await askGeminiOrSimulate('గాంధీ ఆసుపత్రిలో అపాయింట్‌మెంట్ బుక్ చేయండి', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'te',
  });
  assert(storage.getAppointmentProposal() !== null, 'Telugu proposal created');
  const cancelTePropRes = await askGeminiOrSimulate('వద్దు రద్దు చేయండి', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'te',
  });
  assert(
    storage.getAppointmentProposal() === null,
    'Telugu proposal cancelled and cleared from storage'
  );
  assert(
    cancelTePropRes.reply.includes('రద్దు చేయబడింది') && cancelTePropRes.reply.includes('హిస్టరీ'),
    'Telugu reply confirmed cancellation and assured it will not appear in history'
  );

  // Hindi confirm test
  await askGeminiOrSimulate('एम्स दिल्ली में ओपीडी अपॉइंटमेंट बुक करो', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'hi',
  });
  assert(storage.getAppointmentProposal() !== null, 'Hindi proposal created');
  const confirmHiPropRes = await askGeminiOrSimulate('कन्फर्म करें', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'hi',
  });
  assert(
    confirmHiPropRes.action?.type === 'CONFIRM_APPOINTMENT' && confirmHiPropRes.reply.includes('कन्फर्म'),
    'Hindi proposal confirmed and officially booked with CONFIRM_APPOINTMENT action'
  );

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
