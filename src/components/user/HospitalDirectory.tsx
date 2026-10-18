import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Star,
  IndianRupee,
  Navigation,
  Calendar,
  CheckCircle,
  Bot,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { agentBus } from '../../services/agentBus';
import { Hospital, IndianState, Doctor } from '../../types/hospital';
import { useLanguage } from '../../context/LanguageContext';

const INDIAN_STATES: IndianState[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];


interface HospitalDirectoryProps {
  onAppointmentBooked?: () => void;
}

export const HospitalDirectory: React.FC<HospitalDirectoryProps> = ({ onAppointmentBooked }) => {
  const { t } = useLanguage();
  const [hospitals] = useState<Hospital[]>(storage.getHospitals());
  const patient = storage.getPatientProfile();

  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'popularity' | 'distance' | 'cost'>('popularity');
  const [maxCost, setMaxCost] = useState<number>(50);
  const [minRating] = useState<number>(0);

  // Listen for filter events triggered by voice assistant or chat
  React.useEffect(() => {
    const handleFilterEvent = (e: any) => {
      const f = e.detail;
      if (!f) return;
      if (f.state) {
        setSelectedState(f.state);
        setSearchQuery(''); // Clear search query to ensure strictly only this state's hospitals are shown
      }
      if (f.department) setSelectedDepartment(f.department);
      if (f.freeOnly !== undefined) {
        setFreeOnly(f.freeOnly);
        if (f.freeOnly) setMaxCost(0);
      }
      if (f.maxCost !== undefined) setMaxCost(f.maxCost);
      if (f.searchQuery) setSearchQuery(f.searchQuery);
    };

    window.addEventListener('mediguide:filter-hospitals', handleFilterEvent);
    return () => window.removeEventListener('mediguide:filter-hospitals', handleFilterEvent);
  }, []);

  // Booking Modal state
  const [bookingModalHospital, setBookingModalHospital] = useState<Hospital | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    message: string;
    passCode?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredHospitals = hospitals
    .filter((hosp) => {
      const matchState =
        selectedState === 'All' ||
        hosp.state.trim().toLowerCase() === selectedState.trim().toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        hosp.name.toLowerCase().includes(q) ||
        hosp.city.toLowerCase().includes(q) ||
        (selectedState === 'All' && hosp.state.toLowerCase().includes(q)) ||
        hosp.address.toLowerCase().includes(q) ||
        hosp.departments.some((d) => d.toLowerCase().includes(q)) ||
        (q === 'free' && hosp.estimatedConsultationCost === 0) ||
        (q === 'opd' && hosp.departments.includes('General Medicine'));

      const matchDept =
        selectedDepartment === 'All' ||
        hosp.departments.includes(selectedDepartment as any);

      const matchCost = hosp.estimatedConsultationCost <= maxCost;
      const matchFree = !freeOnly || hosp.estimatedConsultationCost === 0;
      const matchRating = hosp.rating >= minRating;

      return matchState && matchSearch && matchDept && matchCost && matchFree && matchRating;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'popularity') return b.popularityScore - a.popularityScore;
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'cost') return a.estimatedConsultationCost - b.estimatedConsultationCost;
      return 0;
    });

  const handleOpenBooking = (hosp: Hospital, doctor?: Doctor) => {
    setBookingModalHospital(hosp);
    // Explicitly prioritize General Medicine for OPD booking
    const opdDoctor =
      doctor ||
      hosp.doctors.find((d) => d.specialty === 'General Medicine') ||
      hosp.doctors[0] ||
      null;
    setSelectedDoctor(opdDoctor);
    setSelectedSlot(opdDoctor?.slots[0] || '10:00 AM');
    setBookingResult(null);
  };


  const handleConfirmBooking = () => {
    if (!bookingModalHospital || !selectedDoctor) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const res = agentBus.bookAppointmentViaAgents({
        hospitalId: bookingModalHospital.id,
        hospitalName: bookingModalHospital.name,
        hospitalCode: bookingModalHospital.uniqueCode,
        hospitalAddress: bookingModalHospital.address,
        googleMapsUrl: bookingModalHospital.googleMapsUrl,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.specialty,
        date: selectedDate,
        requestedSlot: selectedSlot,
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
      });

      setIsSubmitting(false);
      setBookingResult({
        success: res.success,
        message: res.message,
        passCode: res.appointment.passCode,
      });

      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium">
              National OPD Network
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            {t('hosp_title', 'Discover Public Hospitals Across India')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('hosp_subtitle', 'Compare government hospitals, check doctor OPD availability, and book conflict-free slots via Agentic AI.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
            {t('hosp_showing', 'Showing')} <strong className="text-white">{filteredHospitals.length}</strong> {t('hosp_hospitals', 'Hospitals')}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('hosp_search_placeholder', 'Search hospital, city, or specialty...')}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSearchQuery('');
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="All">{t('hosp_all_states', 'All States in India')}</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="popularity">{t('hosp_sort_popularity', 'Sort: Most Popular')}</option>
              <option value="rating">{t('hosp_sort_rating', 'Sort: Highest Rated')}</option>
              <option value="distance">{t('hosp_sort_distance', 'Sort: Nearest Distance')}</option>
              <option value="cost">{t('hosp_sort_cost', 'Sort: Lowest OPD Fee')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <span className="text-[11px] text-slate-400">{t('hosp_max_opd', 'Max OPD:')}</span>
            <div className="flex items-center gap-1 font-semibold text-cyan-400">
              <IndianRupee className="w-3 h-3" />
              <span>{freeOnly || maxCost === 0 ? t('hosp_free_only', 'Free Only') : `Up to ₹${maxCost}`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={freeOnly ? 0 : maxCost}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxCost(val);
                setFreeOnly(val === 0);
              }}
              className="w-20 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Second Row: Specialty Department, Free OPD Quick Toggle & Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium text-[11px]">Specialty:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            >
              <option value="All">All Medical Specialties</option>
              <option value="General Medicine">General Medicine (General OPD)</option>
              <option value="Cardiology">Cardiology (Heart Care)</option>
              <option value="Orthopedics">Orthopedics (Bones & Joints)</option>
              <option value="Neurology">Neurology</option>
              <option value="Pediatrics">Pediatrics (Child Health)</option>
              <option value="Emergency & Trauma">Emergency & Trauma</option>
              <option value="Ophthalmology">Ophthalmology (Eye Care)</option>
            </select>

            <button
              onClick={() => {
                const next = !freeOnly;
                setFreeOnly(next);
                if (next) setMaxCost(0);
                else setMaxCost(50);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                freeOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {freeOnly ? '✔ Free OPD Only (₹0)' : 'Free OPD (₹0)'}
            </button>
          </div>

          {(selectedState !== 'All' || selectedDepartment !== 'All' || freeOnly || searchQuery.trim()) && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Active Filters:</span>
              {selectedState !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-medium flex items-center gap-1">
                  State: {selectedState}
                  <button onClick={() => setSelectedState('All')} className="hover:text-white">×</button>
                </span>
              )}
              {selectedDepartment !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-medium flex items-center gap-1">
                  Dept: {selectedDepartment}
                  <button onClick={() => setSelectedDepartment('All')} className="hover:text-white">×</button>
                </span>
              )}
              {freeOnly && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                  Free Only
                  <button onClick={() => { setFreeOnly(false); setMaxCost(50); }} className="hover:text-white">×</button>
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium flex items-center gap-1">
                  Query: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedState('All');
                  setSelectedDepartment('All');
                  setFreeOnly(false);
                  setMaxCost(50);
                  setSearchQuery('');
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer ml-1"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-xl overflow-hidden flex flex-col justify-between group"
          >
            <div>
              <div className="h-44 relative overflow-hidden bg-slate-950">
                <img
                  src={hospital.image}
                  alt={hospital.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-white font-mono text-[11px] font-bold border border-white/10 shadow-sm">
                    {hospital.uniqueCode}
                  </span>
                  {hospital.isGovernment && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/80 text-slate-950 text-[10px] font-bold shadow-sm">
                      {t('hosp_govt_subsidized', 'Govt Subsidized')}
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-amber-400 font-bold text-xs border border-white/10">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{hospital.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({hospital.reviewsCount})</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-bold text-white leading-tight drop-shadow-md">
                    {hospital.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> {hospital.city}, {hospital.state}
                    </span>
                    <span>•</span>
                    <span className="text-cyan-300">{hospital.distanceKm} {t('hosp_km_away', 'km away')}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t('hosp_opd_fee', 'OPD Reg Fee')}</span>
                    <span className="font-bold text-emerald-400">
                      {hospital.estimatedConsultationCost === 0 ? t('hosp_free', 'FREE') : `₹${hospital.estimatedConsultationCost}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t('hosp_beds_free', 'Beds Free')}</span>
                    <span className="font-bold text-cyan-400">
                      {hospital.bedsAvailable} / {hospital.totalBeds}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t('hosp_popularity', 'Popularity')}</span>
                    <span className="font-bold text-indigo-400">{hospital.popularityScore}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
                    {t('hosp_departments', 'Available Departments:')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {hospital.departments.slice(0, 4).map((dept) => (
                      <span
                        key={dept}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700/60"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
                    {t('hosp_doctors_on_duty', 'Doctors On Duty:')}
                  </span>
                  <div className="space-y-1.5">
                    {hospital.doctors.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={doc.image}
                            alt={doc.name}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div>
                            <div className="font-medium text-slate-200">{doc.name}</div>
                            <div className="text-[10px] text-cyan-400">{doc.specialty}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            doc.status === 'Checked In'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center gap-2">
              <a
                href={hospital.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title={t('hosp_directions', 'View Map')}
              >
                <Navigation className="w-4 h-4" />
              </a>

              <button
                onClick={() => handleOpenBooking(hospital)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('hosp_book_via_agent', 'Book OPD via Agent')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {bookingModalHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setBookingModalHospital(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors z-10"
            >
              ✕
            </button>

            <div className="p-6 bg-gradient-to-r from-slate-950 to-indigo-950 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  {t('book_modal_title', 'Agentic OPD Booking')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {bookingModalHospital.uniqueCode}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{bookingModalHospital.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{bookingModalHospital.address}</p>
            </div>

            <div className="p-6 space-y-4">
              {bookingResult ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">{t('book_success_title', 'Appointment Scheduled!')}</h4>
                    <p className="text-xs text-slate-300 mt-1">{bookingResult.message}</p>
                  </div>

                  {bookingResult.passCode && (
                    <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 max-w-xs mx-auto">
                      <span className="text-[11px] font-bold text-cyan-300 block mb-1">
                        {t('dash_secret_pass_code', 'YOUR SECRET PASS CODE')}:
                      </span>
                      <div className="text-2xl font-mono font-extrabold text-white tracking-widest">
                        {bookingResult.passCode}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('dash_pass_desc', 'Show this to your doctor to conclude your course.')}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setBookingModalHospital(null)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all"
                  >
                    {t('book_done_btn', 'Done & View in My Appointments')}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      {t('book_select_specialist', 'Select Attending Specialist')}
                    </label>
                    <select
                      value={selectedDoctor?.id}
                      onChange={(e) => {
                        const doc = bookingModalHospital.doctors.find((d) => d.id === e.target.value);
                        setSelectedDoctor(doc || null);
                        if (doc) setSelectedSlot(doc.slots[0]);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    >
                      {bookingModalHospital.doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} — {doc.specialty === 'General Medicine' ? 'General Medicine (General OPD)' : doc.specialty} ({doc.qualifications})
                        </option>

                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      {t('book_preferred_date', 'Preferred Date')}
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      {t('book_available_slots', 'Available OPD Slots')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(selectedDoctor?.slots || ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM']).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                            selectedSlot === slot
                              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                              : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Patient:</span>
                      <span className="font-semibold text-white">{patient.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('book_reg_fee', 'Registration Fee')}:</span>
                      <span className="font-semibold text-emerald-400">
                        {bookingModalHospital.estimatedConsultationCost === 0
                          ? t('hosp_free', 'FREE')
                          : `₹${bookingModalHospital.estimatedConsultationCost}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSubmitting ? (
                      <span>Connecting Agents...</span>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>{t('book_confirm_btn', 'Confirm Appointment via Agentic Bus')}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
