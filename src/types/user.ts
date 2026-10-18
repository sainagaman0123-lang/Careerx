import { IndianState } from './hospital';

export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'pharmacy' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  state: IndianState;
  city: string;
  ayushmanBharatId?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
}

export interface HospitalStaffSession {
  staffId: string;
  name: string;
  role: 'doctor' | 'receptionist' | 'pharmacy';
  hospitalId: string;
  hospitalCode: string;
  hospitalName: string;
  department?: string;
  doctorId?: string;
}

export interface ActiveAuthSession {
  role: UserRole;
  user?: UserProfile;
  hospitalStaff?: HospitalStaffSession;
  token: string;
  loginTime: string;
}
