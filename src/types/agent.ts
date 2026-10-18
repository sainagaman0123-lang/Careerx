export type AgentId =
  | 'user_agent'
  | 'user_receptionist_agent'
  | 'res_agent'
  | 'pharm_agent'
  | 'billing_agent'
  | 'doc_agent'
  | 'doc_schd_agent'
  | 'admin_agent';

export interface AgentMetadata {
  id: AgentId;
  name: string;
  roleTitle: string;
  description: string;
  targetUser: 'Patient' | 'Receptionist' | 'Pharmacy Staff' | 'Doctor' | 'Administrator' | 'System Internal';
  status: 'Active' | 'Idle' | 'Processing' | 'Deactivated' | 'Refreshing';
  version: string;
  avatarColor: string;
  lastActive: string;
  messagesHandled: number;
  latencyMs?: number;
}

export type AgentActionType =
  | 'NAVIGATE'
  | 'BOOK_APPOINTMENT_REQUEST'
  | 'SLOT_AVAILABILITY_CHECK'
  | 'APPOINTMENT_PROPOSED'
  | 'APPOINTMENT_ACCEPTED'
  | 'APPOINTMENT_REJECTED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULE_REQUESTED'
  | 'APPOINTMENT_RESCHEDULE_PROPOSED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'PROPOSE_APPOINTMENT'
  | 'CONFIRM_APPOINTMENT'
  | 'CANCEL_PROPOSAL'
  | 'START_COURSE'
  | 'VERIFY_PASS_AND_END_COURSE'
  | 'INVENTORY_LOW_ALERT'
  | 'LOW_STOCK_ALERT'
  | 'RESTOCK_ACKNOWLEDGED'
  | 'STOCK_RESTOCKED_ALERT'
  | 'STOCK_DISPENSED_NOTIFICATION'
  | 'BILL_GENERATED'
  | 'BILL_TRANSMITTED_DIGITAL'
  | 'DISPENSE_BILL_GENERATED'
  | 'EMERGENCY_OVERRIDE'
  | 'AGENT_STATUS_TOGGLE'
  | 'AGENT_STATUS_TOGGLED'
  | 'DOCTOR_CHECK_IN'
  | 'DOCTOR_CHECK_OUT'
  | 'STOCK_REORDER_CONFIRMED'
  | 'SUPERVISION_METRIC_UPDATE'
  | 'OUT_OF_SCOPE_REJECTED'
  | 'GENERAL_CHAT';

export interface AppointmentProposal {
  id: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  hospitalAddress: string;
  googleMapsUrl: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  requestedSlot: string;
  availableSlots: string[];
  isSlotConflict?: boolean;
  conflictReason?: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  status: 'proposed' | 'confirmed' | 'cancelled';
  createdAt: string;
}


export interface AgentMessage {
  id: string;
  sender: AgentId;
  recipient: AgentId | 'user_ui' | 'all';
  actionType: AgentActionType;
  payload: Record<string, any>;
  summary: string;
  timestamp: string;
  status: 'Delivered' | 'Processed' | 'Failed';
}

export interface AgentLogEvent {
  id: string;
  timestamp: string;
  sender: AgentId;
  recipient: string;
  messageType: string;
  details: string;
  latencyMs: number;
  isWarning?: boolean;
}
export interface AgentAuditLog {
  id: string;
  timestamp: string;
  sender?: AgentId | string;
  recipient?: string;
  senderAgent?: string;
  recipientAgent?: string;
  messageType?: string;
  details?: string;
  payloadSummary?: string;
  latencyMs?: number;
  isWarning?: boolean;
}
