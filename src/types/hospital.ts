export type IndianState =
  | 'Andhra Pradesh'
  | 'Arunachal Pradesh'
  | 'Assam'
  | 'Bihar'
  | 'Chandigarh'
  | 'Chhattisgarh'
  | 'Delhi'
  | 'Goa'
  | 'Gujarat'
  | 'Haryana'
  | 'Himachal Pradesh'
  | 'Jammu & Kashmir'
  | 'Jharkhand'
  | 'Karnataka'
  | 'Kerala'
  | 'Ladakh'
  | 'Madhya Pradesh'
  | 'Maharashtra'
  | 'Manipur'
  | 'Meghalaya'
  | 'Mizoram'
  | 'Nagaland'
  | 'Odisha'
  | 'Puducherry'
  | 'Punjab'
  | 'Rajasthan'
  | 'Sikkim'
  | 'Tamil Nadu'
  | 'Telangana'
  | 'Tripura'
  | 'Uttar Pradesh'
  | 'Uttarakhand'
  | 'West Bengal';


export type MedicalDepartment =
  | 'General Medicine'
  | 'Cardiology'
  | 'Orthopedics'
  | 'Neurology'
  | 'Pediatrics'
  | 'Gynecology'
  | 'Dermatology'
  | 'Ophthalmology'
  | 'ENT'
  | 'Emergency & Trauma';

export interface Doctor {
  id: string;
  name: string;
  specialty: MedicalDepartment;
  hospitalId: string;
  experienceYears: number;
  qualifications: string;
  consultationFee: number;
  availableDays: string[];
  slots: string[];
  rating: number;
  image: string;
  status: 'Checked In' | 'Checked Out' | 'On Emergency' | 'On Leave';
  checkInTime?: string;
  checkOutTime?: string;
}

export interface Hospital {
  id: string;
  uniqueCode: string;
  name: string;
  state: IndianState;
  city: string;
  address: string;
  googleMapsUrl: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  estimatedConsultationCost: number;
  distanceKm: number;
  popularityScore: number;
  bedsAvailable: number;
  totalBeds: number;
  isGovernment: boolean;
  departments: MedicalDepartment[];
  image: string;
  doctors: Doctor[];
}

export interface HospitalReview {
  id: string;
  hospitalId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  department: string;
  verifiedVisit: boolean;
}
