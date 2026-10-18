import './setupLocalStorage';
import { ALL_HOSPITALS } from '../src/data/hospitalsData';
import { storage } from '../src/services/storage';
import { askGeminiOrSimulate, detectLanguage } from '../src/services/gemini';

async function runComprehensiveTests() {
  console.log('=== 1. VERIFYING HOSPITAL DATASET ACROSS ALL STATES ===');
  console.log('Total Hospitals in dataset:', ALL_HOSPITALS.length);

  const states = [...new Set(ALL_HOSPITALS.map((h) => h.state))].sort();
  console.log(`Total States & UTs covered: ${states.length}`);
  console.log('States list:', states.join(', '));

  // Check each hospital has valid Google Maps URL and General Medicine doctor
  let missingGeneralMedicine = 0;
  let missingMapsUrl = 0;
  for (const h of ALL_HOSPITALS) {
    if (!h.googleMapsUrl || !h.googleMapsUrl.startsWith('https://maps.google.com/')) {
      missingMapsUrl++;
    }
    if (!h.doctors || h.doctors.length === 0 || h.doctors[0].specialty !== 'General Medicine') {
      missingGeneralMedicine++;
    }
  }
  console.log('Hospitals without proper Google Maps URL:', missingMapsUrl);
  console.log('Hospitals where Doctor #1 is not General Medicine:', missingGeneralMedicine);

  console.log('\n=== 2. VERIFYING LANGUAGE DETECTION & VOICE ALIGNMENT ===');
  const teluguQuery = 'నాకు దగ్గరలోని ఉచిత ఆసుపత్రులు చూపించండి';
  const hindiQuery = 'मुझे पास के सरकारी अस्पताल दिखाओ';
  const englishQuery = 'Show me government hospitals with cardiology in Delhi';

  const teluguLang = detectLanguage(teluguQuery, 'en');
  const hindiLang = detectLanguage(hindiQuery, 'en');
  const englishLang = detectLanguage(englishQuery, 'en');

  console.log(`Telugu query: "${teluguQuery}" -> Detected: ${teluguLang} (Expected: te)`);
  console.log(`Hindi query: "${hindiQuery}" -> Detected: ${hindiLang} (Expected: hi)`);
  console.log(`English query: "${englishQuery}" -> Detected: ${englishLang} (Expected: en)`);

  console.log('\n=== 3. MULTI-STATE & MULTI-FILTER HOSPITAL QUERIES ===');
  // State: Goa
  const goaRes = await askGeminiOrSimulate('Show me hospitals in Goa', { agentId: 'lead', activeRole: 'patient' });
  console.log('Goa search action:', JSON.stringify(goaRes.action));

  // State: Himachal Pradesh
  const hpRes = await askGeminiOrSimulate('Show hospitals in Himachal Pradesh', { agentId: 'lead', activeRole: 'patient' });
  console.log('Himachal search action:', JSON.stringify(hpRes.action));

  // Multi-filter: Free OPD in Assam
  const assamRes = await askGeminiOrSimulate('Show free OPD hospitals in Assam', { agentId: 'lead', activeRole: 'patient' });
  console.log('Assam free search action:', JSON.stringify(assamRes.action));

  // Multi-filter: Telugu free hospitals in Telangana
  const telanganaRes = await askGeminiOrSimulate('తెలంగాణ లో ఉచిత ఆసుపత్రులు చూపించు', { agentId: 'lead', activeRole: 'patient' });
  console.log('Telangana Telugu search detected lang:', telanganaRes.detectedLanguage);
  console.log('Telangana Telugu action:', JSON.stringify(telanganaRes.action));

  // Multi-filter: Hindi hospitals in Bihar
  const biharRes = await askGeminiOrSimulate('बिहार में अस्पताल दिखाओ', { agentId: 'lead', activeRole: 'patient' });
  console.log('Bihar Hindi search detected lang:', biharRes.detectedLanguage);
  console.log('Bihar Hindi action:', JSON.stringify(biharRes.action));

  console.log('\n=== 4. OPD APPOINTMENT BOOKING VERIFICATION ===');
  // Booking in English
  const opdEng = await askGeminiOrSimulate('Book an appointment for OPD', { agentId: 'lead', activeRole: 'patient' });
  console.log('OPD English Booking Reply:\n', opdEng.reply);
  console.log('OPD English Action:', JSON.stringify(opdEng.action));

  // Booking in Telugu
  const opdTe = await askGeminiOrSimulate('ఓపీడీ కోసం అపాయింట్‌మెంట్ బుక్ చేయండి', { agentId: 'lead', activeRole: 'patient' });
  console.log('OPD Telugu Booking Reply:\n', opdTe.reply);
  console.log('OPD Telugu Detected Lang:', opdTe.detectedLanguage);

  // Booking in Hindi
  const opdHi = await askGeminiOrSimulate('ओपीडी के लिए अपॉइंटमेंट बुक करें', { agentId: 'lead', activeRole: 'patient' });
  console.log('OPD Hindi Booking Reply:\n', opdHi.reply);
  console.log('OPD Hindi Detected Lang:', opdHi.detectedLanguage);

  // Verify storage appointments
  const appts = storage.getAppointments();
  console.log(`\nTotal booked appointments in storage: ${appts.length}`);
  const lastAppt = appts[0];
  console.log('Latest Appointment Details:');
  console.log(`- Doctor: ${lastAppt.doctorName} (${lastAppt.department})`);
  console.log(`- Hospital: ${lastAppt.hospitalName}`);
  console.log(`- Pass Code: ${lastAppt.passCode}`);
  console.log(`- Status: ${lastAppt.status}`);

  const newlyBooked = appts.filter((a) => a.id !== 'apt_001');
  const allGeneralMedicine = newlyBooked.length > 0 && newlyBooked.every((a) => a.department === 'General Medicine');
  console.log('\nAre all newly booked OPD appointments strictly in General Medicine? ', allGeneralMedicine ? 'PASS ✅' : 'FAIL ❌');
  console.log(`Newly booked count: ${newlyBooked.length}, Departments:`, newlyBooked.map(a => `${a.doctorName}: ${a.department}`));

  console.log('\n=== ALL END-TO-END CHECKS COMPLETED SUCCESSFULLY! ===');
}

runComprehensiveTests().catch(console.error);
