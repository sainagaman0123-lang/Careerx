import { AgentId, AgentMessage, AgentLogEvent, AgentActionType } from '../types/agent';
import { Appointment, MedicalCourse } from '../types/appointment';
import { PharmacyBill, Medicine } from '../types/pharmacy';
import { storage } from './storage';

type AgentBusListener = (message: AgentMessage) => void;

class AgentMessageBus {
  private listeners: AgentBusListener[] = [];
  private logEvents: AgentLogEvent[] = [];
  private readonly LOG_STORAGE_KEY = 'mediguide_agent_audit_logs_v1';

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.LOG_STORAGE_KEY);
      if (raw) {
        try {
          this.logEvents = JSON.parse(raw);
        } catch {
          this.logEvents = [];
        }
      }
    }
    if (this.logEvents.length === 0) {
      this.seedInitialLogs();
    }
  }

  private seedInitialLogs() {
    const now = new Date();
    this.recordLog({
      id: 'log_seed_1',
      timestamp: new Date(now.getTime() - 1000 * 60 * 12).toLocaleTimeString(),
      sender: 'user_agent',
      recipient: 'user_receptionist_agent',
      messageType: 'SLOT_AVAILABILITY_CHECK',
      details: 'Inquired cardiology morning slot for Ramesh Kumar at AIIMS New Delhi',
      latencyMs: 142,
    });
    this.recordLog({
      id: 'log_seed_2',
      timestamp: new Date(now.getTime() - 1000 * 60 * 8).toLocaleTimeString(),
      sender: 'user_receptionist_agent',
      recipient: 'user_agent',
      messageType: 'APPOINTMENT_ACCEPTED',
      details: 'Confirmed slot 10:00 AM with Dr. Rajesh Sundaram. Passcode generated: PASS-7729',
      latencyMs: 89,
    });
    this.recordLog({
      id: 'log_seed_3',
      timestamp: new Date(now.getTime() - 1000 * 60 * 3).toLocaleTimeString(),
      sender: 'pharm_agent',
      recipient: 'res_agent',
      messageType: 'INVENTORY_LOW_ALERT',
      details: 'WARNING: Pantoprazole 40mg stock dropped to 45 units (below threshold 100). Request restock.',
      latencyMs: 44,
      isWarning: true,
    });
  }

  public subscribe(listener: AgentBusListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public onMessage(listener: AgentBusListener): () => void {
    return this.subscribe(listener);
  }


  public getLogs(): AgentLogEvent[] {
    return [...this.logEvents];
  }

  public clearLogs() {
    this.logEvents = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.LOG_STORAGE_KEY);
    }
  }

  private recordLog(event: AgentLogEvent) {
    this.logEvents.unshift(event);
    if (this.logEvents.length > 200) {
      this.logEvents = this.logEvents.slice(0, 200);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.LOG_STORAGE_KEY, JSON.stringify(this.logEvents));
    }
  }

  public dispatch(
    sender: AgentId,
    recipient: AgentId | 'user_ui' | 'all',
    actionType: AgentActionType,
    payload: Record<string, any>,
    summary: string,
    latencyMs: number = 75,
    isWarning: boolean = false
  ): AgentMessage {
    const message: AgentMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      sender,
      recipient,
      actionType,
      payload,
      summary,
      timestamp: new Date().toLocaleTimeString(),
      status: 'Delivered',
    };

    const agents = storage.getAgents();
    const target = agents.find((a) => a.id === sender);
    if (target) {
      storage.updateAgent(sender, {
        messagesHandled: target.messagesHandled + 1,
        lastActive: 'Just now',
      });
    }

    this.recordLog({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      timestamp: message.timestamp,
      sender,
      recipient,
      senderAgent: sender,
      recipientAgent: recipient,
      messageType: actionType,
      details: summary,
      payloadSummary: summary,
      latencyMs,
      isWarning,
    } as any);


    this.listeners.forEach((fn) => {
      try {
        fn(message);
      } catch (err) {
        console.error('AgentBus listener error:', err);
      }
    });

    return message;
  }

  public bookAppointmentViaAgents(params: {
    hospitalId: string;
    hospitalName: string;
    hospitalCode: string;
    hospitalAddress: string;
    googleMapsUrl: string;
    doctorId: string;
    doctorName: string;
    department: any;
    date: string;
    requestedSlot: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
  }): { success: boolean; appointment: Appointment; message: string; alternativeSlot?: string } {
    this.dispatch(
      'user_agent',
      'user_receptionist_agent',
      'SLOT_AVAILABILITY_CHECK',
      { doctorId: params.doctorId, date: params.date, requestedSlot: params.requestedSlot },
      `Patient ${params.patientName} requested ${params.requestedSlot} on ${params.date} with ${params.doctorName}`
    );

    const existingAppointments = storage.getAppointments();
    const hasConflict = existingAppointments.some(
      (a) =>
        a.doctorId === params.doctorId &&
        a.appointmentDate === params.date &&
        a.timeSlot === params.requestedSlot &&
        (a.status === 'Accepted' || a.status === 'Pending')
    );

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const passCode = `PASS-${randomDigits}`;

    if (hasConflict) {
      const allSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '03:00 PM'];
      const bookedSlots = existingAppointments
        .filter((a) => a.doctorId === params.doctorId && a.appointmentDate === params.date && a.status !== 'Rejected')
        .map((a) => a.timeSlot);
      const freeSlots = allSlots.filter((s) => !bookedSlots.includes(s));
      const nextAvailable = freeSlots[0] || '11:30 AM';

      this.dispatch(
        'user_receptionist_agent',
        'user_agent',
        'APPOINTMENT_RESCHEDULE_PROPOSED',
        { originalSlot: params.requestedSlot, proposedSlot: nextAvailable },
        `Slot ${params.requestedSlot} occupied. user_receptionist_agent proposes next available slot: ${nextAvailable}`
      );

      const appointment: Appointment = {
        id: 'apt_' + Date.now(),
        patientId: params.patientId,
        patientName: params.patientName,
        patientPhone: params.patientPhone,
        hospitalId: params.hospitalId,
        hospitalName: params.hospitalName,
        hospitalCode: params.hospitalCode,
        hospitalAddress: params.hospitalAddress,
        googleMapsUrl: params.googleMapsUrl,
        doctorId: params.doctorId,
        doctorName: params.doctorName,
        department: params.department,
        appointmentDate: params.date,
        timeSlot: nextAvailable,
        status: 'Rescheduled',
        rescheduleProposedSlot: nextAvailable,
        passCode,
        createdAt: new Date().toISOString(),
      };

      storage.addAppointment(appointment);
      return {
        success: true,
        appointment,
        message: `Original slot was busy. Rescheduled to next open slot: ${nextAvailable}`,
        alternativeSlot: nextAvailable,
      };
    }

    const newAppointment: Appointment = {
      id: 'apt_' + Date.now(),
      patientId: params.patientId,
      patientName: params.patientName,
      patientPhone: params.patientPhone,
      hospitalId: params.hospitalId,
      hospitalName: params.hospitalName,
      hospitalCode: params.hospitalCode,
      hospitalAddress: params.hospitalAddress,
      googleMapsUrl: params.googleMapsUrl,
      doctorId: params.doctorId,
      doctorName: params.doctorName,
      department: params.department,
      appointmentDate: params.date,
      timeSlot: params.requestedSlot,
      status: 'Accepted',
      passCode,
      createdAt: new Date().toISOString(),
    };

    storage.addAppointment(newAppointment);

    this.dispatch(
      'user_receptionist_agent',
      'user_agent',
      'APPOINTMENT_ACCEPTED',
      { appointmentId: newAppointment.id, passCode, slot: params.requestedSlot },
      `Appointment confirmed for ${params.patientName} at ${params.requestedSlot}. Verification Passcode: ${passCode}`
    );

    return {
      success: true,
      appointment: newAppointment,
      message: `Appointment confirmed with ${params.doctorName} at ${params.requestedSlot}!`,
    };
  }

  public rescheduleAppointmentViaAgents(params: {
    appointmentId: string;
    newDate?: string;
    newSlot?: string;
    reason?: string;
  }): { success: boolean; appointment: Appointment; message: string } {
    const appointments = storage.getAppointments();
    const apt = appointments.find((a) => a.id === params.appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const targetDate = params.newDate || (apt.appointmentDate <= new Date().toISOString().split('T')[0] ? tomorrow : apt.appointmentDate);
    const targetSlot = params.newSlot || (apt.timeSlot === '10:00 AM' ? '11:30 AM' : '10:00 AM');

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const passCode = `PASS-${randomDigits}`;

    const updated: Appointment = {
      ...apt,
      previousAppointmentDate: apt.appointmentDate,
      previousTimeSlot: apt.timeSlot,
      appointmentDate: targetDate,
      timeSlot: targetSlot,
      status: 'Rescheduled',
      passCode,
      rescheduleProposedSlot: targetSlot,
      rescheduleReason: params.reason || 'Patient / User Agent Rescheduled Appointment',
      rejectionReason: undefined,
    };

    storage.updateAppointment(params.appointmentId, updated);

    this.dispatch(
      'user_agent',
      'user_receptionist_agent',
      'APPOINTMENT_RESCHEDULE_REQUESTED',
      {
        appointmentId: params.appointmentId,
        doctor: apt.doctorName,
        hospital: apt.hospitalName,
        previousDate: apt.appointmentDate,
        previousSlot: apt.timeSlot,
        newDate: targetDate,
        newSlot: targetSlot,
        reason: params.reason || 'Patient / User Agent Rescheduled Appointment',
      },
      `Patient ${apt.patientName} requested appointment reschedule with ${apt.doctorName} to ${targetDate} at ${targetSlot}.`
    );

    this.dispatch(
      'user_receptionist_agent',
      'user_agent',
      'APPOINTMENT_RESCHEDULED',
      {
        appointmentId: params.appointmentId,
        newDate: targetDate,
        newSlot: targetSlot,
        passCode,
      },
      `Appointment successfully rescheduled for ${apt.patientName} with ${apt.doctorName} at ${apt.hospitalName}. New Slot: ${targetDate} at ${targetSlot}. Passcode: ${passCode}`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mediguide:appointment-updated', {
          detail: { appointmentId: params.appointmentId, status: 'Rescheduled', newDate: targetDate, newSlot: targetSlot },
        })
      );
    }

    return {
      success: true,
      appointment: updated,
      message: `Appointment with ${apt.doctorName} successfully rescheduled to ${targetDate} at ${targetSlot}! New Pass Code: ${passCode}`,
    };
  }

  public cancelAppointmentViaAgents(params: {
    appointmentId: string;
    reason?: string;
  }): { success: boolean; appointment: Appointment; message: string } {
    const appointments = storage.getAppointments();
    const apt = appointments.find((a) => a.id === params.appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const updated: Appointment = {
      ...apt,
      status: 'Cancelled',
      rejectionReason: params.reason || 'Cancelled by Citizen via MediNav Agent',
    };

    storage.updateAppointment(params.appointmentId, updated);

    this.dispatch(
      'user_agent',
      'user_receptionist_agent',
      'APPOINTMENT_CANCELLED',
      {
        appointmentId: params.appointmentId,
        doctor: apt.doctorName,
        hospital: apt.hospitalName,
        date: apt.appointmentDate,
        timeSlot: apt.timeSlot,
        reason: params.reason || 'Cancelled by Citizen via MediNav Agent',
      },
      `Patient ${apt.patientName} cancelled appointment at ${apt.hospitalName} with ${apt.doctorName}.`
    );

    this.dispatch(
      'user_receptionist_agent',
      'doc_agent',
      'APPOINTMENT_CANCELLED',
      {
        appointmentId: params.appointmentId,
        doctor: apt.doctorName,
        hospital: apt.hospitalName,
        date: apt.appointmentDate,
      },
      `ReceptionDesk informed Dr. ${apt.doctorName} of slot cancellation for ${apt.patientName}.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mediguide:appointment-updated', {
          detail: { appointmentId: params.appointmentId, status: 'Cancelled' },
        })
      );
    }

    return {
      success: true,
      appointment: updated,
      message: `Appointment at ${apt.hospitalName} successfully cancelled!`,
    };
  }

  public triggerEmergencyOverride(
    existingAppointmentId: string,
    emergencyReason: string
  ): { success: boolean; postponedAppointment: Appointment; voucherCode: string } {
    const appointments = storage.getAppointments();
    const apt = appointments.find((a) => a.id === existingAppointmentId);
    if (!apt) throw new Error('Appointment not found');

    const voucherCode = 'EMERGENCY-CARE-25-' + Math.floor(1000 + Math.random() * 9000);

    const updated: Appointment = {
      ...apt,
      status: 'Emergency Postponed',
      isEmergencyOverride: true,
      discountAppliedPercentage: 25,
      discountVoucherCode: voucherCode,
      rejectionReason: `Doctor called to urgent trauma/emergency: ${emergencyReason}. Slot postponed with 25% pharmacy/consultation waiver.`,
    };

    storage.updateAppointment(existingAppointmentId, updated);

    this.dispatch(
      'doc_schd_agent',
      'user_agent',
      'EMERGENCY_OVERRIDE',
      { appointmentId: existingAppointmentId, voucherCode, discount: 25 },
      `Emergency priority override. ${apt.patientName}'s appointment rescheduled with 25% compensation discount (${voucherCode}).`,
      92,
      true
    );

    return {
      success: true,
      postponedAppointment: updated,
      voucherCode,
    };
  }

  public startCourse(params: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    hospitalId: string;
    hospitalName: string;
    department: any;
    diagnosis: string;
    medicines: any[];
    nextFollowUpDate?: string;
    notes: string;
  }): MedicalCourse {
    const courseCode = `COURSE-${Math.floor(1000 + Math.random() * 9000)}`;
    const passCode = `PASS-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCourse: MedicalCourse = {
      id: 'crs_' + Date.now(),
      courseCode,
      patientId: params.patientId,
      patientName: params.patientName,
      doctorId: params.doctorId,
      doctorName: params.doctorName,
      hospitalId: params.hospitalId,
      hospitalName: params.hospitalName,
      department: params.department,
      diagnosis: params.diagnosis,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      medicines: params.medicines,
      nextFollowUpDate: params.nextFollowUpDate,
      verificationPassCode: passCode,
      notes: params.notes,
    };

    storage.addCourse(newCourse);

    this.dispatch(
      'doc_agent',
      'user_agent',
      'START_COURSE',
      { courseId: newCourse.id, courseCode, passCode },
      `Course ${courseCode} initiated for ${params.patientName}. Patient Pass Code: ${passCode}`
    );

    return newCourse;
  }

  public endCourseWithPassCode(courseId: string, enteredPassCode: string): { success: boolean; message: string } {
    const courses = storage.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return { success: false, message: 'Course record not found.' };
    }

    if (course.verificationPassCode.trim().toUpperCase() !== enteredPassCode.trim().toUpperCase()) {
      return {
        success: false,
        message: `Invalid Pass Code! Doctor must obtain the secret pass code from ${course.patientName}'s app to verify completion.`,
      };
    }

    storage.updateCourse(courseId, {
      status: 'Completed',
      endDate: new Date().toISOString().split('T')[0],
    });

    this.dispatch(
      'doc_agent',
      'user_agent',
      'VERIFY_PASS_AND_END_COURSE',
      { courseId, enteredPassCode },
      `Passcode verified successfully. Course ${course.courseCode} officially concluded with ${course.patientName}.`
    );

    return {
      success: true,
      message: `Course successfully verified and concluded! Proof of consultation validated.`,
    };
  }

  public verifyAndEndCourse(courseId: string, enteredPassCode: string): { success: boolean; message: string } {
    return this.endCourseWithPassCode(courseId, enteredPassCode);
  }

  public triggerLowStockAlert(medicine: Medicine) {
    this.dispatch(
      'pharm_agent',
      'res_agent',
      'INVENTORY_LOW_ALERT',
      {
        medicineId: medicine.id,
        name: medicine.name,
        available: medicine.availableQuantity,
        threshold: medicine.minimumThreshold,
      },
      `Low Stock Alert: ${medicine.name} has only ${medicine.availableQuantity} units left (Threshold: ${medicine.minimumThreshold}). Restock required immediately.`,
      48,
      true
    );
  }

  public dispatchBill(bill: PharmacyBill) {
    storage.addBill(bill);

    bill.items.forEach((item) => {
      const remainingList = storage.updateMedicineQuantity(item.medicineId, -item.quantity);
      const updatedMed = remainingList.find((m) => m.id === item.medicineId);
      if (updatedMed && updatedMed.availableQuantity <= updatedMed.minimumThreshold) {
        this.triggerLowStockAlert(updatedMed);
      }
    });

    this.dispatch(
      'billing_agent',
      'user_agent',
      'BILL_GENERATED',
      { billId: bill.id, billNumber: bill.billNumber, total: bill.grandTotal, hospital: bill.hospitalName },
      `Bill ${bill.billNumber} for ₹${bill.grandTotal} generated by ${bill.hospitalName} and synchronized to patient portal.`
    );
  }
}

export const agentBus = new AgentMessageBus();
