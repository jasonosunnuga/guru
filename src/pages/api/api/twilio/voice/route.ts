import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const twiml = new VoiceResponse();

  // Welcome message
  twiml.say({
    voice: 'Polly.Amy-Neural'
  }, 'Hello! Welcome to the Council Helpline. I am Guru, your AI assistant. I will help you with your council service needs today.');

  // Gather initial input
  const gather = twiml.gather({
    input: 'speech',
    timeout: 10,
    speechTimeout: 'auto',
    action: '/api/twilio/process',
    method: 'POST'
  });

  gather.say({
    voice: 'Polly.Amy-Neural'
  }, 'Please tell me what council service you need help with today. For example, you can say Blue Badge application, report a missed bin collection, or housing benefit.');

  // Fallback if no input
  twiml.say({
    voice: 'Polly.Amy-Neural'
  }, 'I did not receive any input. Please call back when you are ready to speak. Goodbye!');

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}