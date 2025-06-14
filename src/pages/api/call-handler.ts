// src/pages/api/call-handler.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { twilioClient } from '@/lib/twilio';

const { VoiceResponse } = twilio.twiml;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isVoice = Boolean(req.body.SpeechResult);
  const isSMS   = Boolean(req.body.Body) && !isVoice;
  const from    = (req.body.From as string) || '';

  // --- 1) If neither voice nor SMS, assume new call and prompt for speech ---
  if (!isVoice && !isSMS) {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/call-handler',
      method: 'POST',
      timeout: 5,
    });
    gather.say(
      "Hi, I'm Guru, your council helper. " +
      "Please briefly describe what you need help with today."
    );
    // If no response, redirect back to prompt
    twiml.redirect('/api/call-handler');

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  // --- 2) Capture the transcription or SMS body ---
  const transcription = isVoice
    ? (req.body.SpeechResult as string)
    : (req.body.Body as string);

  // --- 3) Use OpenAI to categorize + suggest action ---
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: "system", content: "You're an AI that categorizes council service requests." },
      { role: "user",   content: `Caller said: "${transcription}"` }
    ]
  });
  const aiReply = completion.choices[0].message?.content?.trim()
                || "I'm sorry, I did not understand your request.";

  // --- 4) Log into Supabase ---
  const { data, error } = await supabase
    .from('queries')
    .insert({
      phone: from,
      message: transcription,
      category: aiReply.split('\n')[0],
      recommendedAction: aiReply,
      submittedAt: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Supabase insert error:', error);
    // Log the full error details
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    // Still proceed with Twilio response even if DB insert fails
  } else {
    console.log('Successfully inserted into Supabase:', data);
  }

  // --- 5a) If SMS, reply via SMS only ---
  if (isSMS) {
    await twilioClient.messages.create({
      body: `Thanks! We've logged your request as: ${aiReply}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to:   from,
    });
    return res.status(200).end();
  }

  // --- 5b) If Voice, reply on-call via TwiML + also send SMS ---
  const twiml = new VoiceResponse();
  twiml.say(
    `Thank you. Your request has been logged as: ${aiReply}. ` +
    'A confirmation text has also been sent. Goodbye.'
  );
  twiml.hangup();

  // SMS follow-up
  await twilioClient.messages.create({
    body: `We've logged your council request: ${aiReply}`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to:   from,
  });

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml.toString());
}
