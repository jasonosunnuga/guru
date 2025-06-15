export interface ResidentQuery {
    id: string;
    phone: string;
    message: string;
    category: string;
    recommendedAction: string;
    submittedAt: string;
  }
  
export type QueryStatus = 'pending' | 'in_progress' | 'complete';

export type FieldType = 'text' | 'date' | 'email' | 'phone' | 'address' | 'postcode' | 'file';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export interface ServiceRequirements {
  fields: FormField[];
  docs: string[];
  fees: string;
  eligibility: string;
  processingTime: string;
}

export interface QueryDetails {
  service: string;
  collectedFields: Record<string, string>;
  requiredFields: FormField[];
  statusFlags: string[];
  lastQuestion: string;
  recommendedAction: string;
}

export interface Query {
  id: string;
  callSid: string;
  phone: string;
  step: number;
  status: QueryStatus;
  details: QueryDetails;
  message: string;
  submittedAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ScrapedService {
  url: string;
  fields: FormField[];
  docs: string[];
  fees: string;
  eligibility: string;
  processingTime: string;
}
  