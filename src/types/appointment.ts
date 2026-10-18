import { MedicalDepartment } from './hospital';

export type AppointmentStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'Rescheduled'
  | 'Completed'
  | 'Emergency Postponed'
  | 'Cancelled';

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: 'Once Daily' | 'Twice Daily' | 'Thrice Daily' | 'SOS (As Needed)';
  timing: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  durationDays: number;
  instructions: string;
}

export interface MedicalCourse {
  id: string;
  courseCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  hospitalName: string;
  department: MedicalDepartment;
  diagnosis: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'Terminated';
  medicines: PrescribedMedicine[];
  nextFollowUpDate?: string;
  verificationPassCode: string;
  notes: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  hospitalAddress: string;
  googleMapsUrl: string;
  doctorId: string;
  doctorName: string;
  department: MedicalDepartment;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  rejectionReason?: string;
  rescheduleProposedSlot?: string;
  passCode: string;
  isEmergencyOverride?: boolean;
  discountAppliedPercentage?: number;
  discountVoucherCode?: string;
  createdAt: string;
  courseId?: string;
  rescheduleReason?: string;
  previousAppointmentDate?: string;
  previousTimeSlot?: string;
}
