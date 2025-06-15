import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { SERVICE_DEFINITIONS } from '@/types/services';

const VoiceResponse = twilio.twiml.VoiceResponse;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CallSession {
  stage: 'service_selection' | 'information_gathering' | 'confirmation' | 'completion';
  currentService?: string;
  collectedData: Record<string, any>;
  currentFieldIndex: number;
  conversationHistory: string[];
}

// In-memory session storage (in production, use Redis or database)
const sessions = new Map<string, CallSession>();

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult') as string;
  const callSid = formData.get('CallSid') as string;
  const from = formData.get('From') as string;

  const twiml = new VoiceResponse();

  try {
    // Get or create session
    let session = sessions.get(callSid) || {
      stage: 'service_selection',
      collectedData: {},
      currentFieldIndex: 0,
      conversationHistory: []
    };

    session.conversationHistory.push(`User: ${speechResult}`);

    let responseText = '';
    let nextAction: 'gather' | 'hangup' = 'gather';

    switch (session.stage) {
      case 'service_selection':
        const serviceResult = await identifyService(speechResult);
        if (serviceResult) {
          session.currentService = serviceResult;
          session.stage = 'information_gathering';
          session.collectedData = {};
          session.currentFieldIndex = 0;
          
          const service = SERVICE_DEFINITIONS[serviceResult];
          responseText = `Great! I'll help you with ${service.name}. ${service.welcomeMessage} Let me start by getting your full name.`;
        } else {
          const services = Object.values(SERVICE_DEFINITIONS);
          const serviceList = services.map((s, i) => `${i + 1}, ${s.name}`).join(', ');
          responseText = `I didn't quite catch which service you need. Please choose from: ${serviceList}. You can say the service name or just the number.`;
        }
        break;

      case 'information_gathering':
        const fieldResult = await processFieldInput(speechResult, session);
        responseText = fieldResult.response;
        session = fieldResult.updatedSession;
        
        if (session.stage === 'confirmation') {
          nextAction = 'gather';
        }
        break;

      case 'confirmation':
        const confirmed = await processConfirmation(speechResult);
        if (confirmed) {
          await saveQuery(session, from);
          responseText = `Perfect! I've submitted your ${SERVICE_DEFINITIONS[session.currentService!].name} request. You'll receive a confirmation email shortly with your reference number and next steps. Thank you for using our service!`;
          nextAction = 'hangup';
        } else {
          session.stage = 'information_gathering';
          responseText = "No problem! Let me go through the information again. What would you like to change?";
        }
        break;
    }

    session.conversationHistory.push(`Assistant: ${responseText}`);
    sessions.set(callSid, session);

    // Generate TwiML response
    twiml.say({
      voice: 'Polly.Amy-Neural'
    }, responseText);

    if (nextAction === 'gather') {
      const gather = twiml.gather({
        input: 'speech',
        timeout: 10,
        speechTimeout: 'auto',
        action: '/api/twilio/process',
        method: 'POST'
      });

      gather.say({
        voice: 'Polly.Amy-Neural'
      }, 'Please go ahead.');
    } else {
      twiml.hangup();
    }

  } catch (error) {
    console.error('Error processing call:', error);
    twiml.say({
      voice: 'Polly.Amy-Neural'
    }, 'I apologize, but I encountered an error. Please try calling back or visit our website. Goodbye!');
    twiml.hangup();
  }

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

async function identifyService(speechResult: string): Promise<string | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are helping identify which council service a caller needs. Based on their speech, return ONLY the service ID from these options:
          - blue_badge: Blue Badge application for disabled parking
          - missed_bin: Report missed bin collection
          - housing_benefit: Housing benefit application
          - pothole_report: Report pothole or road damage
          - planning_permission: Planning permission application
          - noise_complaint: Noise complaint reporting
          - council_tax_reduction: Council tax reduction application
          - street_lighting: Street lighting issues
          - other: Any other service not listed
          
          Return only the service ID, nothing else. If unclear, return null.`
        },
        {
          role: "user",
          content: speechResult
        }
      ],
      temperature: 0,
      max_tokens: 50
    });

    const serviceId = completion.choices[0]?.message?.content?.trim();
    return SERVICE_DEFINITIONS[serviceId!] ? serviceId! : null;
  } catch (error) {
    console.error('Error identifying service:', error);
    return null;
  }
}

async function processFieldInput(speechResult: string, session: CallSession) {
  const service = SERVICE_DEFINITIONS[session.currentService!];
  const currentField = service.requiredFields[session.currentFieldIndex];
  
  try {
    // Use OpenAI to extract and validate the field value
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are processing a ${currentField.type} field called "${currentField.label}". 
          Extract the relevant information from the user's speech and return it in a clean format.
          For email addresses, ensure proper format. For phone numbers, extract digits.
          For dates, use YYYY-MM-DD format. For addresses, format clearly.
          If the information seems invalid or incomplete, return "INVALID".`
        },
        {
          role: "user",
          content: speechResult
        }
      ],
      temperature: 0,
      max_tokens: 100
    });

    const extractedValue = completion.choices[0]?.message?.content?.trim();
    
    if (extractedValue && extractedValue !== "INVALID") {
      session.collectedData[currentField.id] = extractedValue;
      session.currentFieldIndex++;
      
      // Check if we've collected all required fields
      if (session.currentFieldIndex >= service.requiredFields.length) {
        session.stage = 'confirmation';
        const summary = Object.entries(session.collectedData)
          .map(([key, value]) => {
            const field = service.requiredFields.find(f => f.id === key);
            return `${field?.label}: ${value}`;
          })
          .join(', ');
        
        return {
          response: `Thank you! I've collected all the information: ${summary}. Is this information correct? Please say yes to confirm or no to make changes.`,
          updatedSession: session
        };
      } else {
        const nextField = service.requiredFields[session.currentFieldIndex];
        return {
          response: `Thank you. Now I need your ${nextField.label.toLowerCase()}. ${nextField.helpText || ''}`,
          updatedSession: session
        };
      }
    } else {
      return {
        response: `I didn't quite catch that. Could you please repeat your ${currentField.label.toLowerCase()}?`,
        updatedSession: session
      };
    }
  } catch (error) {
    console.error('Error processing field input:', error);
    return {
      response: `I had trouble processing that information. Could you please repeat your ${currentField.label.toLowerCase()}?`,
      updatedSession: session
    };
  }
}

async function processConfirmation(speechResult: string): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "The user is confirming information. Return 'yes' if they're confirming/agreeing, 'no' if they want to make changes. Look for words like yes, correct, right, okay, sure vs no, wrong, change, incorrect."
        },
        {
          role: "user",
          content: speechResult
        }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content?.trim().toLowerCase();
    return response === 'yes';
  } catch (error) {
    console.error('Error processing confirmation:', error);
    return false;
  }
}

async function saveQuery(session: CallSession, phoneNumber: string) {
  const service = SERVICE_DEFINITIONS[session.currentService!];
  
  const queryData = {
    resident_name: session.collectedData.full_name || session.collectedData.name || 'Phone Caller',
    resident_email: session.collectedData.email || session.collectedData.resident_email || '',
    resident_phone: phoneNumber,
    service_type: session.currentService as any,
    priority: service.priority,
    status: 'pending' as const,
    conversation_log: session.conversationHistory.map((msg, index) => ({
      id: index.toString(),
      role: msg.startsWith('User:') ? 'user' as const : 'assistant' as const,
      content: msg.replace(/^(User|Assistant): /, ''),
      timestamp: new Date().toISOString()
    })),
    collected_data: session.collectedData,
    staff_notes: `Phone call processed via Guru AI Assistant`,
    email_sent: false
  };

  try {
    const { data, error } = await supabase
      .from('queries')
      .insert([queryData])
      .select()
      .single();

    if (!error && data && session.collectedData.email) {
      // Send confirmation email
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId: data.id,
          email: session.collectedData.email,
          name: session.collectedData.full_name || session.collectedData.name,
          service: service.name,
          data: session.collectedData
        })
      });
    }
  } catch (error) {
    console.error('Error saving query:', error);
  }
}