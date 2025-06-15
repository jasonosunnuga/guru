import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { withErrorHandler, AppError } from '@/lib/error-handler';
import * as cheerio from 'cheerio';

const requirements: Record<string, any> = {
  "apply-blue-badge": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "date_of_birth", label: "Date of birth", type: "date", required: true },
      { name: "address", label: "Address (including postcode)", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "disability_type", label: "Type of disability", type: "text", required: true },
      { name: "proof_of_disability", label: "Proof of disability", type: "file", required: true }
    ],
    docs: ["Proof of disability", "Proof of address", "Passport photo"],
    fees: "£10",
    eligibility: "Resident with qualifying disability",
    processingTime: "10 working days"
  },
  "report-missed-bin-collection": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "address", label: "Address (including postcode)", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "bin_type", label: "Type of bin (e.g. recycling, general waste)", type: "text", required: true },
      { name: "collection_date", label: "Date of missed collection", type: "date", required: true },
      { name: "additional_info", label: "Additional information", type: "text", required: false }
    ],
    docs: [],
    fees: "Free",
    eligibility: "Resident",
    processingTime: "2 working days"
  },
  "apply-housing-benefit": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "date_of_birth", label: "Date of birth", type: "date", required: true },
      { name: "address", label: "Current address (including postcode)", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "income_details", label: "Income details", type: "text", required: true },
      { name: "savings_amount", label: "Amount of savings", type: "text", required: true },
      { name: "rent_amount", label: "Monthly rent amount", type: "text", required: true }
    ],
    docs: ["Proof of income", "Bank statements", "Rent agreement"],
    fees: "Free",
    eligibility: "Low income resident",
    processingTime: "15 working days"
  },
  "report-pothole": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "location", label: "Location of pothole", type: "address", required: true },
      { name: "pothole_size", label: "Size of pothole", type: "text", required: true },
      { name: "additional_info", label: "Additional information", type: "text", required: false }
    ],
    docs: ["Photo of pothole"],
    fees: "Free",
    eligibility: "Any resident",
    processingTime: "5 working days"
  },
  "apply-planning-permission": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "address", label: "Property address", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "project_type", label: "Type of project", type: "text", required: true },
      { name: "project_description", label: "Project description", type: "text", required: true }
    ],
    docs: ["Site plans", "Elevation drawings", "Location plan"],
    fees: "£206",
    eligibility: "Property owner",
    processingTime: "8 weeks"
  },
  "report-noise-complaint": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "address", label: "Your address", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "noise_location", label: "Location of noise", type: "address", required: true },
      { name: "noise_type", label: "Type of noise", type: "text", required: true },
      { name: "noise_times", label: "When does the noise occur", type: "text", required: true }
    ],
    docs: [],
    fees: "Free",
    eligibility: "Any resident",
    processingTime: "3 working days"
  },
  "apply-council-tax-reduction": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "date_of_birth", label: "Date of birth", type: "date", required: true },
      { name: "address", label: "Address (including postcode)", type: "address", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "income_details", label: "Income details", type: "text", required: true },
      { name: "savings_amount", label: "Amount of savings", type: "text", required: true }
    ],
    docs: ["Proof of income", "Bank statements", "Council tax bill"],
    fees: "Free",
    eligibility: "Low income resident",
    processingTime: "15 working days"
  },
  "report-street-lighting": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "location", label: "Location of street light", type: "address", required: true },
      { name: "issue_type", label: "Type of issue", type: "text", required: true },
      { name: "additional_info", label: "Additional information", type: "text", required: false }
    ],
    docs: [],
    fees: "Free",
    eligibility: "Any resident",
    processingTime: "5 working days"
  },
  "general-inquiry": {
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "phone", label: "Phone number", type: "phone", required: true },
      { name: "inquiry_type", label: "Type of inquiry", type: "text", required: true },
      { name: "inquiry_details", label: "Details of your inquiry", type: "text", required: true }
    ],
    docs: [],
    fees: "Free",
    eligibility: "Any resident",
    processingTime: "5 working days"
  }
};

async function scrapeGovUk(service: string) {
  const baseUrl = 'https://www.gov.uk';
  const url = `${baseUrl}/${service}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract form fields with better parsing
    const fields = $('form')
      .find('input, select, textarea')
      .map((_, el) => {
        const $el = $(el);
        const name = $el.attr('name') || '';
        const id = $el.attr('id') || '';
        const type = $el.attr('type') || el.tagName;
        const required = $el.attr('required') !== undefined;
        
        // Look for label in various ways
        let label = '';
        if (id) {
          label = $(`label[for="${id}"]`).text().trim();
        }
        if (!label) {
          label = $el.closest('.form-group').find('label').first().text().trim();
        }
        if (!label) {
          label = $el.attr('placeholder') || name.replace(/_/g, ' ');
        }

        return { 
          name, 
          label: label.charAt(0).toUpperCase() + label.slice(1),
          type: type.toLowerCase(),
          required 
        };
      })
      .get()
      .filter(field => field.name && field.label); // Remove empty fields

    // Extract additional information
    const docs = $('.document-list li, .required-documents li')
      .map((_, el) => $(el).text().trim())
      .get();

    const fees = $('.fee-amount, .cost').first().text().trim() || 'Free';
    const eligibility = $('.eligibility-criteria, .who-can-apply').first().text().trim() || 'Any resident';
    const processingTime = $('.processing-time, .how-long-it-takes').first().text().trim() || '5 working days';

    return {
      fields,
      docs,
      fees,
      eligibility,
      processingTime
    };
  } catch (err) {
    console.error('Scrape error:', err);
    return null;
  }
}

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    throw new AppError(405, 'Method not allowed');
  }

  const { service } = req.query;

  if (!service || typeof service !== 'string') {
    throw new AppError(400, 'Service name is required');
  }

  const { data, error } = await supabase
    .from('service_requirements')
    .select('*')
    .eq('name', service)
    .single();

  if (error) {
    throw new AppError(500, 'Error fetching service requirements');
  }

  if (!data) {
    throw new AppError(404, 'Service not found');
  }

  res.status(200).json(data);
});
