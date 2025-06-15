export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiredFields: ServiceField[];
  welcomeMessage: string;
  completionMessage: string;
}

export interface ServiceField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'date' | 'address' | 'file';
  required: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
  helpText?: string;
  followUpQuestions?: string[];
}

export const SERVICE_DEFINITIONS: Record<string, ServiceDefinition> = {
  blue_badge: {
    id: 'blue_badge',
    name: 'Blue Badge Application',
    description: 'Apply for a Blue Badge parking permit for disabled individuals',
    category: 'Accessibility',
    priority: 'medium',
    welcomeMessage: "I'll help you apply for a Blue Badge. This permit allows you to park closer to your destination. I'll need to collect some personal and medical information.",
    completionMessage: "Great! I've collected all the information needed for your Blue Badge application. You'll receive a confirmation email shortly with next steps.",
    requiredFields: [
      { id: 'full_name', label: 'Full Name', type: 'text', required: true },
      { id: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'address', label: 'Home Address', type: 'address', required: true },
      { id: 'disability_type', label: 'Type of Disability', type: 'select', required: true, 
        options: ['Mobility impairment', 'Visual impairment', 'Hidden disability', 'Other'],
        followUpQuestions: ['Can you tell me more about how this affects your mobility?'] },
      { id: 'medical_evidence', label: 'Do you have medical evidence?', type: 'select', required: true,
        options: ['Yes, I have it ready', 'Yes, but need to obtain it', 'No, I need guidance'] },
      { id: 'current_medication', label: 'Current medications affecting mobility', type: 'text', required: false }
    ]
  },
  missed_bin: {
    id: 'missed_bin',
    name: 'Report Missed Bin Collection',
    description: 'Report a missed bin collection for your property',
    category: 'Waste Management',
    priority: 'medium',
    welcomeMessage: "I'll help you report a missed bin collection. I'll need some details about your property and which bins weren't collected.",
    completionMessage: "Thank you for reporting the missed collection. We'll investigate and arrange for collection within 48 hours. You'll receive a confirmation email with a reference number.",
    requiredFields: [
      { id: 'property_address', label: 'Property Address', type: 'address', required: true },
      { id: 'collection_date', label: 'Scheduled Collection Date', type: 'date', required: true },
      { id: 'bin_types', label: 'Which bins were missed?', type: 'multiselect', required: true,
        options: ['General waste (black)', 'Recycling (blue)', 'Garden waste (green)', 'Food waste (brown)'] },
      { id: 'bin_location', label: 'Where were the bins placed?', type: 'select', required: true,
        options: ['Outside property boundary', 'On pavement', 'In designated area', 'Other location'] },
      { id: 'additional_info', label: 'Any additional information?', type: 'text', required: false }
    ]
  },
  housing_benefit: {
    id: 'housing_benefit',
    name: 'Housing Benefit Application',
    description: 'Apply for housing benefit to help with rent costs',
    category: 'Benefits',
    priority: 'high',
    welcomeMessage: "I'll help you apply for Housing Benefit. This can help with your rent costs. I'll need to collect information about your circumstances, income, and housing situation.",
    completionMessage: "I've collected all the initial information for your Housing Benefit application. You'll receive an email with the application reference and information about required documents.",
    requiredFields: [
      { id: 'full_name', label: 'Full Name', type: 'text', required: true },
      { id: 'national_insurance', label: 'National Insurance Number', type: 'text', required: true },
      { id: 'current_address', label: 'Current Address', type: 'address', required: true },
      { id: 'rental_amount', label: 'Weekly/Monthly Rent Amount', type: 'text', required: true },
      { id: 'employment_status', label: 'Employment Status', type: 'select', required: true,
        options: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired', 'Unable to work'] },
      { id: 'household_size', label: 'Number of people in household', type: 'select', required: true,
        options: ['1', '2', '3', '4', '5', '6 or more'] },
      { id: 'savings_amount', label: 'Total savings and investments', type: 'select', required: true,
        options: ['Under £6,000', '£6,000 - £16,000', 'Over £16,000', 'Prefer not to say'] }
    ]
  },
  pothole_report: {
    id: 'pothole_report',
    name: 'Report Pothole',
    description: 'Report a pothole or road surface issue',
    category: 'Highways',
    priority: 'medium',
    welcomeMessage: "I'll help you report a pothole or road surface issue. I'll need the location details and information about the severity of the problem.",
    completionMessage: "Thank you for reporting the pothole. We'll assess the issue within 5 working days and take appropriate action. You'll receive a confirmation email with a reference number.",
    requiredFields: [
      { id: 'location', label: 'Exact Location', type: 'address', required: true },
      { id: 'severity', label: 'How severe is the pothole?', type: 'select', required: true,
        options: ['Minor - small crack or chip', 'Moderate - noticeable hole', 'Severe - large hole or dangerous', 'Urgent - immediate safety hazard'] },
      { id: 'size_estimate', label: 'Approximate size', type: 'select', required: true,
        options: ['Smaller than a dinner plate', 'Dinner plate sized', 'Larger than a dinner plate', 'Very large area'] },
      { id: 'safety_concern', label: 'Is it causing safety issues?', type: 'select', required: true,
        options: ['No safety issues', 'Minor inconvenience', 'Moderate safety concern', 'Serious safety hazard'] },
      { id: 'additional_details', label: 'Additional details or landmarks', type: 'text', required: false }
    ]
  }
};