import { Hospital, HospitalReview } from '../types/hospital';
import { Appointment, MedicalCourse } from '../types/appointment';
import { Medicine, PharmacyBill } from '../types/pharmacy';
import { UserProfile, ActiveAuthSession } from '../types/user';
import { AgentMetadata, AppointmentProposal } from '../types/agent';
import {
  INITIAL_HOSPITALS,
  INITIAL_PATIENT,
  INITIAL_MEDICINES,
  INITIAL_COURSES,
  INITIAL_APPOINTMENTS,
  INITIAL_BILLS,
  INITIAL_AGENTS,
  INITIAL_REVIEWS,
} from '../data/seedData';

const STORAGE_KEYS = {
  HOSPITALS: 'mediguide_hospitals_v1',
  PATIENT_PROFILE: 'mediguide_patient_profile_v1',
  MEDICINES: 'mediguide_medicines_v1',
  COURSES: 'mediguide_courses_v1',
  APPOINTMENTS: 'mediguide_appointments_v1',
  APPOINTMENT_PROPOSAL: 'mediguide_appointment_proposal_v1',
  BILLS: 'mediguide_bills_v1',
  AGENTS: 'mediguide_agents_v1',
  REVIEWS: 'mediguide_reviews_v1',
  AUTH_SESSION: 'mediguide_auth_session_v1',
  GEMINI_API_KEY: 'mediguide_gemini_api_key_v1',
  APP_LANGUAGE: 'mediguide_app_language_v1',
};

export const storage = {
  init() {
    if (typeof localStorage === 'undefined') return;
    try {
      const storedHospitals = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
      if (!storedHospitals || JSON.parse(storedHospitals).length !== INITIAL_HOSPITALS.length) {
        localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
      }
    } catch {
      localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
    }

    if (!localStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE)) {
      localStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(INITIAL_PATIENT));
    }
    try {
      const storedMeds = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      if (!storedMeds) {
        localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(INITIAL_MEDICINES));
      } else {
        const parsedMeds: Medicine[] = JSON.parse(storedMeds);
        let updated = false;
        const mapped = parsedMeds.map((m) => {
          if (!m.location) {
            const seed = INITIAL_MEDICINES.find(
              (sm) => sm.id === m.id || sm.name.toLowerCase().includes(m.name.toLowerCase())
            );
            if (seed) {
              updated = true;
              return { ...m, rack: seed.rack, column: seed.column, row: seed.row, location: seed.location };
            } else {
              updated = true;
              return { ...m, rack: 1, column: 1, row: 1, location: '1st rack, 1st column, 1st row' };
            }
          }
          return m;
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(mapped));
        }
      }
    } catch {
      localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(INITIAL_MEDICINES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(INITIAL_BILLS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AGENTS)) {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(INITIAL_AGENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)) {
      const defaultSession: ActiveAuthSession = {
        role: 'patient',
        user: INITIAL_PATIENT,
        token: 'demo_token_patient',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(defaultSession));
    }
  },

  resetAll() {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
    localStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(INITIAL_PATIENT));
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(INITIAL_MEDICINES));
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(INITIAL_BILLS));
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(INITIAL_AGENTS));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    window.location.reload();
  },

  getAuthSession(): ActiveAuthSession {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) {
      return {
        role: 'patient',
        user: INITIAL_PATIENT,
        token: 'demo_token_patient',
        loginTime: new Date().toISOString(),
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        role: 'patient',
        user: INITIAL_PATIENT,
        token: 'demo_token_patient',
        loginTime: new Date().toISOString(),
      };
    }
  },

  setAuthSession(session: ActiveAuthSession) {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  },

  getHospitals(): Hospital[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    if (!raw) return INITIAL_HOSPITALS;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length < INITIAL_HOSPITALS.length) {
        localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
        return INITIAL_HOSPITALS;
      }
      return parsed;
    } catch {
      return INITIAL_HOSPITALS;
    }
  },

  setHospitals(hospitals: Hospital[]) {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
  },

  addHospital(hospital: Hospital) {
    const list = this.getHospitals();
    list.unshift(hospital);
    this.setHospitals(list);
  },

  getAppointments(): Appointment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return raw ? JSON.parse(raw) : INITIAL_APPOINTMENTS;
  },

  setAppointments(appointments: Appointment[]) {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mediguide:appointment-updated', { detail: appointments }));
    }
  },

  addAppointment(appointment: Appointment) {
    const list = this.getAppointments();
    list.unshift(appointment);
    this.setAppointments(list);
  },

  updateAppointment(appointmentId: string, updates: Partial<Appointment>) {
    const list = this.getAppointments().map((apt) =>
      apt.id === appointmentId ? { ...apt, ...updates } : apt
    );
    this.setAppointments(list);
  },

  getAppointmentProposal(): AppointmentProposal | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENT_PROPOSAL);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setAppointmentProposal(proposal: AppointmentProposal | null) {
    if (typeof localStorage === 'undefined') return;
    if (!proposal) {
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENT_PROPOSAL);
    } else {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENT_PROPOSAL, JSON.stringify(proposal));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mediguide:proposal-updated', { detail: proposal }));
    }
  },

  clearAppointmentProposal() {
    this.setAppointmentProposal(null);
  },

  getAvailableSlotsForDoctor(doctorId: string, date: string): {
    allSlots: string[];
    bookedSlots: string[];
    availableSlots: string[];
  } {
    const allSlots = [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
    ];
    const appointments = this.getAppointments();
    const bookedSlots = appointments
      .filter(
        (a) =>
          a.doctorId === doctorId &&
          a.appointmentDate === date &&
          a.status !== 'Rejected' &&
          a.status !== 'Cancelled'
      )
      .map((a) => a.timeSlot);
    const availableSlots = allSlots.filter((s) => !bookedSlots.includes(s));
    return { allSlots, bookedSlots, availableSlots };
  },

  getCourses(): MedicalCourse[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COURSES);
    return raw ? JSON.parse(raw) : INITIAL_COURSES;
  },

  setCourses(courses: MedicalCourse[]) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  addCourse(course: MedicalCourse) {
    const list = this.getCourses();
    list.unshift(course);
    this.setCourses(list);
  },

  updateCourse(courseId: string, updates: Partial<MedicalCourse>) {
    const list = this.getCourses().map((c) =>
      c.id === courseId ? { ...c, ...updates } : c
    );
    this.setCourses(list);
  },

  getMedicines(): Medicine[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDICINES);
    return raw ? JSON.parse(raw) : INITIAL_MEDICINES;
  },

  setMedicines(medicines: Medicine[]) {
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mediguide:medicines-updated', { detail: medicines }));
    }
  },

  updateMedicineQuantity(medicineId: string, deltaQuantity: number) {
    const list = this.getMedicines().map((m) => {
      if (m.id === medicineId) {
        const newQty = Math.max(0, m.availableQuantity + deltaQuantity);
        return { ...m, availableQuantity: newQty };
      }
      return m;
    });
    this.setMedicines(list);
    return list;
  },

  getBills(): PharmacyBill[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    return raw ? JSON.parse(raw) : INITIAL_BILLS;
  },

  setBills(bills: PharmacyBill[]) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  },

  addBill(bill: PharmacyBill) {
    const list = this.getBills();
    list.unshift(bill);
    this.setBills(list);
  },

  getPatientProfile(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE);
    return raw ? JSON.parse(raw) : INITIAL_PATIENT;
  },

  setPatientProfile(profile: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(profile));

    // Synchronize citizen name and contact details across all appointments
    const appointments = this.getAppointments().map((apt) => {
      if (apt.patientId === profile.id || apt.patientId === 'usr_patient_demo' || !apt.patientId) {
        return {
          ...apt,
          patientName: profile.name,
          patientPhone: profile.phone,
        };
      }
      return apt;
    });
    this.setAppointments(appointments);

    // Synchronize medical courses
    const courses = this.getCourses().map((c) => {
      if (c.patientId === profile.id || c.patientId === 'usr_patient_demo' || !c.patientId) {
        return {
          ...c,
          patientName: profile.name,
        };
      }
      return c;
    });
    this.setCourses(courses);

    // Synchronize billing history
    const bills = this.getBills().map((b) => {
      if (b.patientId === profile.id || !b.patientId) {
        return {
          ...b,
          patientName: profile.name,
          patientWhatsApp: profile.phone,
          patientEmail: profile.email,
        };
      }
      return b;
    });
    this.setBills(bills);

    // Update active auth session if role is patient
    const session = this.getAuthSession();
    if (session.role === 'patient') {
      session.user = profile;
      this.setAuthSession(session);
    }

    // Broadcast update event so all portals update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mediguide:profile-updated', { detail: profile }));
    }
  },

  restockOrAddMedicine(params: {
    id?: string;
    name: string;
    genericName?: string;
    category?: string;
    pricePerUnit?: number;
    quantity: number;
    rack: number;
    column: number;
    row: number;
    hospitalId?: string;
  }): Medicine {
    const list = this.getMedicines();
    const rackStr = `${params.rack}${params.rack === 1 ? 'st' : params.rack === 2 ? 'nd' : params.rack === 3 ? 'rd' : 'th'} rack, ${params.column}${params.column === 1 ? 'st' : params.column === 2 ? 'nd' : params.column === 3 ? 'rd' : 'th'} column, ${params.row}${params.row === 1 ? 'st' : params.row === 2 ? 'nd' : params.row === 3 ? 'rd' : 'th'} row`;

    const existingIndex = list.findIndex(
      (m) => (params.id && m.id === params.id) || m.name.toLowerCase() === params.name.toLowerCase()
    );

    if (existingIndex !== -1) {
      const existing = list[existingIndex];
      const updated: Medicine = {
        ...existing,
        availableQuantity: existing.availableQuantity + params.quantity,
        rack: params.rack,
        column: params.column,
        row: params.row,
        location: rackStr,
        pricePerUnit: params.pricePerUnit !== undefined && params.pricePerUnit > 0 ? params.pricePerUnit : existing.pricePerUnit,
      };
      list[existingIndex] = updated;
      this.setMedicines(list);
      return updated;
    } else {
      const newMed: Medicine = {
        id: params.id || `med_${Date.now()}`,
        name: params.name,
        genericName: params.genericName || params.name,
        category: params.category || 'General Formulations',
        batchNumber: `BT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        pricePerUnit: params.pricePerUnit || 10,
        availableQuantity: params.quantity,
        minimumThreshold: 50,
        expiryDate: '2028-12-31',
        manufacturer: 'Jan Aushadhi / Public Depot',
        hospitalId: params.hospitalId || 'hosp_del_01',
        rack: params.rack,
        column: params.column,
        row: params.row,
        location: rackStr,
      };
      list.unshift(newMed);
      this.setMedicines(list);
      return newMed;
    }
  },

  getAgents(): AgentMetadata[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AGENTS);
    return raw ? JSON.parse(raw) : INITIAL_AGENTS;
  },

  setAgents(agents: AgentMetadata[]) {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  },

  updateAgent(agentId: string, updates: Partial<AgentMetadata>) {
    const list = this.getAgents().map((a) =>
      a.id === agentId ? { ...a, ...updates, lastActive: 'Just now' } : a
    );
    this.setAgents(list);
  },

  getReviews(): HospitalReview[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return raw ? JSON.parse(raw) : INITIAL_REVIEWS;
  },

  setReviews(reviews: HospitalReview[]) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  },

  addReview(review: HospitalReview) {
    const list = this.getReviews();
    list.unshift(review);
    this.setReviews(list);
  },

  getGeminiApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
  },

  setGeminiApiKey(key: string) {
    localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key.trim());
  },

  getLanguage(): string {
    return localStorage.getItem(STORAGE_KEYS.APP_LANGUAGE) || 'en';
  },

  setLanguage(lang: string) {
    localStorage.setItem(STORAGE_KEYS.APP_LANGUAGE, lang);
  },
};

storage.init();

// Convenience named exports
export const getHospitals = () => storage.getHospitals();
export const setHospitals = (h: Hospital[]) => storage.setHospitals(h);
export const addHospital = (h: Hospital) => storage.addHospital(h);

export const getUserProfile = () => storage.getPatientProfile();
export const getPatientProfile = () => storage.getPatientProfile();
export const saveUserProfile = (p: UserProfile) => storage.setPatientProfile(p);
export const setPatientProfile = (p: UserProfile) => storage.setPatientProfile(p);

export const getMedicines = () => storage.getMedicines();
export const saveMedicines = (m: Medicine[]) => storage.setMedicines(m);
export const updateMedicine = (id: string, updates: Partial<Medicine>) => {
  const list = storage.getMedicines().map((m) => (m.id === id ? { ...m, ...updates } : m));
  storage.setMedicines(list);
  return list;
};
export const updateMedicineQuantity = (id: string, delta: number) => storage.updateMedicineQuantity(id, delta);
export const restockOrAddMedicine = (params: Parameters<typeof storage.restockOrAddMedicine>[0]) => storage.restockOrAddMedicine(params);

export const getAppointments = () => storage.getAppointments();
export const setAppointments = (a: Appointment[]) => storage.setAppointments(a);
export const addAppointment = (a: Appointment) => storage.addAppointment(a);
export const updateAppointment = (id: string, updates: Partial<Appointment>) => storage.updateAppointment(id, updates);

export const getMedicalCourses = () => storage.getCourses();
export const getCourses = () => storage.getCourses();
export const setCourses = (c: MedicalCourse[]) => storage.setCourses(c);
export const addCourse = (c: MedicalCourse) => storage.addCourse(c);
export const updateCourse = (id: string, updates: Partial<MedicalCourse>) => storage.updateCourse(id, updates);

export const getPharmacyBills = () => storage.getBills();
export const getBills = () => storage.getBills();
export const setBills = (b: PharmacyBill[]) => storage.setBills(b);
export const addPharmacyBill = (b: PharmacyBill) => storage.addBill(b);
export const addBill = (b: PharmacyBill) => storage.addBill(b);

export const getAgents = () => storage.getAgents();
export const setAgents = (a: AgentMetadata[]) => storage.setAgents(a);
export const updateAgent = (id: string, updates: Partial<AgentMetadata>) => storage.updateAgent(id, updates);

export const getHospitalReviews = () => storage.getReviews();
export const getReviews = () => storage.getReviews();
export const addReview = (r: HospitalReview) => storage.addReview(r);

export const getActiveAuthSession = () => storage.getAuthSession();
export const getAuthSession = () => storage.getAuthSession();
export const saveActiveAuthSession = (s: ActiveAuthSession) => storage.setAuthSession(s);
export const setAuthSession = (s: ActiveAuthSession) => storage.setAuthSession(s);

export const getGeminiApiKey = () => storage.getGeminiApiKey();
export const setGeminiApiKey = (k: string) => storage.setGeminiApiKey(k);

export const getAgentAuditLogs = () => {
  const raw = localStorage.getItem('mediguide_agent_audit_logs_v1');
  return raw ? JSON.parse(raw) : [];
};
