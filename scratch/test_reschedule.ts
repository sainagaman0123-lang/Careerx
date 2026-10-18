import './setupLocalStorage';
import { storage } from '../src/services/storage';
import { agentBus } from '../src/services/agentBus';
import { askGeminiOrSimulate } from '../src/services/gemini';
import { Appointment } from '../src/types/appointment';

async function testRescheduleFeature() {
  console.log('=== STARTING APPOINTMENT RESCHEDULE TESTS ===\n');

  // Seed an initial completed appointment (representing an appointment that already happened)
  const completedApt: Appointment = {
    id: 'apt_completed_test_01',
    patientId: 'usr_pat_001',
    patientName: 'Ramesh Kumar Sharma',
    patientPhone: '+91 98765 43210',
    hospitalId: 'hosp_hyd_02',
    hospitalName: 'Osmania General Hospital (OGH)',
    hospitalCode: 'OGH-HYD-02',
    hospitalAddress: 'Afzal Gunj, Hyderabad, Telangana 500012',
    googleMapsUrl: 'https://maps.google.com/?q=Osmania+General+Hospital+Hyderabad',
    doctorId: 'doc_hyd_02',
    doctorName: 'Dr. K. Sridhar Reddy',
    department: 'General Medicine',
    appointmentDate: '2026-09-20', // past date
    timeSlot: '09:00 AM',
    status: 'Completed',
    passCode: 'PASS-1111',
    createdAt: '2026-09-20T08:00:00Z',
  };

  storage.addAppointment(completedApt);
  console.log('1. Created prior completed appointment:');
  console.log(`   - ID: ${completedApt.id}`);
  console.log(`   - Status: ${completedApt.status}`);
  console.log(`   - Doctor: ${completedApt.doctorName} (${completedApt.department})`);
  console.log(`   - Original Date: ${completedApt.appointmentDate} at ${completedApt.timeSlot}\n`);

  // Test 1: Direct AgentBus reschedule on completed appointment
  console.log('2. Testing agentBus.rescheduleAppointmentViaAgents on completed appointment:');
  const res1 = agentBus.rescheduleAppointmentViaAgents({
    appointmentId: completedApt.id,
    newDate: '2026-09-28',
    newSlot: '11:30 AM',
    reason: 'Follow-up consultation after previous visit',
  });

  console.log('   - Success:', res1.success);
  console.log('   - New Status:', res1.appointment.status);
  console.log('   - New Date & Slot:', `${res1.appointment.appointmentDate} at ${res1.appointment.timeSlot}`);
  console.log('   - New Secret Pass Code:', res1.appointment.passCode);
  console.log('   - Previous Date:', res1.appointment.previousAppointmentDate);
  console.log('   - Bus Message:', res1.message);

  if (res1.appointment.status !== 'Rescheduled' || res1.appointment.passCode === 'PASS-1111') {
    throw new Error('Test 1 failed: status was not Rescheduled or passCode not regenerated');
  }
  console.log('   => Test 1 PASSED: Completed appointment successfully rescheduled! ✅\n');

  // Test 2: Reschedule via user_agent (English query)
  console.log('3. Testing user_agent AI rescheduling in English ("Reschedule my appointment to tomorrow at 2 PM"):');
  const enRes = await askGeminiOrSimulate('Reschedule my appointment to tomorrow at 2 PM', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'en',
  });

  console.log('   - Action:', JSON.stringify(enRes.action));
  console.log('   - Detected Language:', enRes.detectedLanguage);
  console.log('   - Agent Reply:\n', enRes.reply);

  const apptsAfterEn = storage.getAppointments();
  const latestAptEn = apptsAfterEn[0];
  console.log('   - Storage Updated Slot:', `${latestAptEn.appointmentDate} at ${latestAptEn.timeSlot}`);
  console.log('   - Storage Pass Code:', latestAptEn.passCode);
  console.log('   - Storage Status:', latestAptEn.status);

  if (latestAptEn.timeSlot !== '02:00 PM' || latestAptEn.status !== 'Rescheduled') {
    throw new Error('Test 2 failed: English user_agent reschedule did not update slot or status');
  }
  console.log('   => Test 2 PASSED: English user_agent reschedule succeeded! ✅\n');

  // Test 3: Reschedule via user_agent in Telugu
  console.log('4. Testing user_agent AI rescheduling in Telugu ("నా అపాయింట్‌మెంట్‌ను రీషెడ్యూల్ చేయండి"):');
  const teRes = await askGeminiOrSimulate('నా అపాయింట్‌మెంట్‌ను రీషెడ్యూల్ చేయండి', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'te',
  });

  console.log('   - Action:', JSON.stringify(teRes.action));
  console.log('   - Detected Language:', teRes.detectedLanguage);
  console.log('   - Agent Reply:\n', teRes.reply);

  if (teRes.detectedLanguage !== 'te' || !teRes.reply.includes('రీషెడ్యూల్')) {
    throw new Error('Test 3 failed: Telugu language response incorrect');
  }
  console.log('   => Test 3 PASSED: Telugu user_agent reschedule succeeded! ✅\n');

  // Test 4: Reschedule via user_agent in Hindi
  console.log('5. Testing user_agent AI rescheduling in Hindi ("मेरी अपॉइंटमेंट 11 बजे रीशेड्यूल करो"):');
  const hiRes = await askGeminiOrSimulate('मेरी अपॉइंटमेंट 11 बजे रीशेड्यूल करो', {
    agentId: 'user_agent',
    activeRole: 'patient',
    language: 'hi',
  });

  console.log('   - Action:', JSON.stringify(hiRes.action));
  console.log('   - Detected Language:', hiRes.detectedLanguage);
  console.log('   - Agent Reply:\n', hiRes.reply);

  if (hiRes.detectedLanguage !== 'hi' || !hiRes.reply.includes('रीशेड्यूल')) {
    throw new Error('Test 4 failed: Hindi language response incorrect');
  }
  console.log('   => Test 4 PASSED: Hindi user_agent reschedule succeeded! ✅\n');

  // Test 5: Verify Agent Message Bus logs for APPOINTMENT_RESCHEDULE_REQUESTED & APPOINTMENT_RESCHEDULED
  const logs = agentBus.getLogs();
  const rescheduleReqLogs = logs.filter((l) => l.messageType === 'APPOINTMENT_RESCHEDULE_REQUESTED');
  const rescheduledLogs = logs.filter((l) => l.messageType === 'APPOINTMENT_RESCHEDULED');

  console.log('6. Verifying Agent Message Bus Event Logs:');
  console.log(`   - APPOINTMENT_RESCHEDULE_REQUESTED dispatched: ${rescheduleReqLogs.length} times`);
  console.log(`   - APPOINTMENT_RESCHEDULED dispatched: ${rescheduledLogs.length} times`);

  if (rescheduleReqLogs.length === 0 || rescheduledLogs.length === 0) {
    throw new Error('Test 5 failed: Agent bus logs missing reschedule events');
  }
  console.log('   => Test 5 PASSED: Multi-agent coordination verified on bus! ✅\n');

  console.log('=== ALL APPOINTMENT RESCHEDULE TESTS PASSED WITH 100% SUCCESS! ===');
}

testRescheduleFeature().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
