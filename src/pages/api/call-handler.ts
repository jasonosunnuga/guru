// src/pages/api/call-handler.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import rawBody from 'raw-body';
import { parse } from 'querystring';
import twilio from 'twilio';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import { sendCustomerEmail } from '@/lib/sendgrid';

const { VoiceResponse } = twilio.twiml;

// Tell Next.js not to parse the body (we need raw form data)
export const config = {
  api: { bodyParser: false }
};

// Phrases that mean "I'm done"
const DONE_PHRASES = [
  "i am done","i'm done","that's all","finished","no more",
  "nothing else","end","stop","complete","yes i'm done","yes that's all"
];
function userIsDone(input: string): boolean {
  const t = input.trim().toLowerCase();
  return DONE_PHRASES.some(p => t === p || t.includes(p));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const twiml = new VoiceResponse();
  try {
    // 1) parse Twilio's form-encoded POST
    const buf  = await rawBody(req);
    const body = parse(buf.toString());
    const callSid = String(body.CallSid || body.From || '');
    const speech  = String(body.SpeechResult || '').trim();

    // 2) load or initialize conversation
    const { data: convRow } = await supabase
      .from('conversations')
      .select('messages, status')
      .eq('callSid', callSid)
      .maybeSingle();

    let messages: Array<{ role: string; content: string }> = [];
    let status = 'active';
    if (convRow) {
      messages = convRow.messages as any || [];
      status   = convRow.status as string || 'active';
    }

    // 3) first turn: ask the opening prompt
    if (!speech) {
      // ask initial question
      const g = twiml.gather({
        input:   ['speech'],
        action:  '/api/call-handler',
        method:  'POST',
        timeout: 5
      });
      g.say("Hi, I'm Guru, your council assistant. How can I help you today?");
      twiml.redirect('/api/call-handler');
      res.setHeader('Content-Type','text/xml');
      return res.status(200).send(twiml.toString());
    }

    // 4) append user utterance
    messages.push({ role: 'user', content: speech });

    // 5) check for done‐phrase
    if (userIsDone(speech) && status === 'active') {
      // build summary email & dashboard entry
      const summaryText = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? 'You:' : 'Guru:'} ${m.content}`)
        .join('\n');

      // email to staff or user?—here we email support@council.gov
      await sendCustomerEmail(
        'staff@council.gov',
        `Completed call ${callSid}`,
        `The caller said they're done. Here is the full transcript:\n\n${summaryText}`,
        `<pre>${summaryText}</pre>`
      );

      // mark conversation completed
      await supabase
        .from('conversations')
        .upsert({ callSid, messages, status: 'completed', updated_at: new Date().toISOString() })
        .eq('callSid', callSid);

      // final TwiML
      twiml.say("Thanks! I've logged your request and sent a summary to our dashboard and emailed next steps. Goodbye!");
      twiml.hangup();
      res.setHeader('Content-Type','text/xml');
      return res.status(200).send(twiml.toString());
    }

    // 6) call OpenAI to generate the next follow-up
    const systemPrompt = `
You are Guru, a friendly, expert AI assistant for UK local council services.
Your job is to gather all necessary details from the caller—address, email, dates, etc—
in a natural conversation.  Ask one question at a time, waiting for their reply.
Once they say "I'm done" or similar, respond with a closing summary.
`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system',  content: systemPrompt.trim() },
        ...messages.map(m => ({ role: m.role as any, content: m.content }))
      ],
      temperature: 0.7
    });
    const aiMsg = completion.choices[0]?.message?.content?.trim()
                ?? "Sorry, I didn't catch that.";

    // 7) append AI message
    messages.push({ role: 'assistant', content: aiMsg });

    // 8) upsert back to Supabase
    await supabase
      .from('conversations')
      .upsert(
        {
          callSid,
          messages,
          status: 'active',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'callSid' }
      );

    // 9) speak and loop
    const g2 = twiml.gather({
      input:  ['speech'],
      action: '/api/call-handler',
      method: 'POST',
      timeout: 5
    });
    g2.say(aiMsg);
    twiml.redirect('/api/call-handler');

    res.setHeader('Content-Type','text/xml');
    return res.status(200).send(twiml.toString());

  } catch (err: any) {
    console.error('CALL HANDLER ERROR:', err);
    twiml.say("Sorry, we're having technical issues—please try again later.");
    twiml.hangup();
    res.setHeader('Content-Type','text/xml');
    return res.status(500).send(twiml.toString());
  }
}
