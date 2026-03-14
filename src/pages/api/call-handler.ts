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
  "nothing else","end","stop","complete","yes i'm done","yes that's all",
  "goodbye","bye","thank you","thanks","that's it"
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
    const isFallback = body.SpeechResult === undefined && body.Digits === undefined;

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
    if (!speech && messages.length === 0) {
      // ask initial question
      const g = twiml.gather({
        input:   ['speech'],
        action:  '/api/call-handler',
        method:  'POST',
        timeout: 10,
        speechTimeout: 'auto'
      });
      g.say("Hello! I'm Guru, your AI government assistant. I can help you with any government-related questions, services, or information you need. What can I help you with today?");
      
      // Add fallback if no input is received
      twiml.say("I didn't hear anything. Please speak clearly and tell me what you need help with.");
      twiml.redirect('/api/call-handler');
      res.setHeader('Content-Type','text/xml');
      return res.status(200).send(twiml.toString());
    }

    // Handle fallback for ongoing conversations
    if (!speech && messages.length > 0) {
      const g = twiml.gather({
        input:   ['speech'],
        action:  '/api/call-handler',
        method:  'POST',
        timeout: 10,
        speechTimeout: 'auto'
      });
      g.say("I didn't catch that. Could you please repeat what you said?");
      
      // Add fallback if no input is received again
      twiml.say("I still didn't hear anything. Please speak clearly or say goodbye if you're done.");
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
      twiml.say("Thank you for calling! I hope I was able to help you today. Have a great day!");
      twiml.hangup();
      res.setHeader('Content-Type','text/xml');
      return res.status(200).send(twiml.toString());
    }

    // 6) call OpenAI for natural conversation
    const systemPrompt = `
You are Guru, a friendly and knowledgeable AI assistant for government services and information.

CONVERSATION CONTEXT:
This is ${messages.length > 2 ? 'an ongoing conversation' : 'the start of a conversation'}. 
${messages.length > 2 ? 'Continue the conversation naturally based on what has been discussed. Do not repeat your introduction.' : 'Welcome the user briefly and ask how you can help them.'}

CONVERSATION HISTORY:
${messages.length > 2 ? `Previous messages: ${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join(' | ')}` : 'This is a new conversation.'}

CONVERSATION STYLE:
- Be warm, helpful, and PROACTIVE
- Take control of the conversation - guide them to solutions
- Give specific, actionable answers
- Suggest relevant services or information they might need
- Be confident and knowledgeable about government services
- Don't be generic - provide real, helpful information
- If they seem unsure, suggest common services they might need
- Stay focused on the current topic

CONVERSATION FLOW:
- After giving advice or information, use common sense to decide next action:
  * If they asked a simple question and you answered it completely, ask "Is there anything else I can help you with today?"
  * If they asked about a complex process, ask if they need help with the next step
  * If they mentioned multiple issues, ask about the next one
  * If they seem satisfied with your answer, offer to help with other services
  * If they said "thank you" or similar, end the conversation warmly
- Don't just stay silent after giving advice - always guide the conversation forward

CRITICAL RULES:
- NEVER repeat your introduction or ask "How can I help you today?" in an ongoing conversation
- NEVER say generic things like "please provide the specific question you need help with"
- NEVER provide irrelevant information like current time, weather, or unrelated topics
- ALWAYS stay focused on the government-related topic being discussed
- Keep responses SHORT and to the point (max 2 sentences)
- ANSWER their question directly with specific information
- If they ask about a service, give specific details about that service
- If they ask about a process, explain the specific steps
- If they seem unsure, suggest 2-3 common services they might need
- Take initiative - guide them to the right information or service
- Be specific about what they need to do, where to go, or who to contact
- After giving advice, always ask a follow-up question or offer additional help

Remember: Be proactive, take control, provide specific helpful information, and use common sense to guide the conversation flow.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system',  content: systemPrompt.trim() },
        ...messages.slice(-6).map(m => ({ role: m.role as any, content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    const aiMsg = completion.choices[0]?.message?.content?.trim()
                ?? "I'm sorry, I didn't quite catch that. Could you please repeat your question?";

    // Ensure the AI message is not empty and is safe for speech
    const safeAiMsg = aiMsg || "I'm sorry, I didn't quite catch that. Could you please repeat your question?";
    
    // Remove any problematic characters that might cause TwiML issues and ensure brevity
    const cleanAiMsg = safeAiMsg.replace(/[<>]/g, '').substring(0, 500);

    // 7) append AI message
    messages.push({ role: 'assistant', content: cleanAiMsg });

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
      timeout: 10,
      speechTimeout: 'auto'
    });
    g2.say(cleanAiMsg);

    res.setHeader('Content-Type','text/xml');
    return res.status(200).send(twiml.toString());

  } catch (err: any) {
    console.error('CALL HANDLER ERROR:', err);
    twiml.say("I'm sorry, but I'm experiencing some technical difficulties right now. Please try calling back in a few minutes or visit our website for assistance.");
    twiml.hangup();
    res.setHeader('Content-Type','text/xml');
    return res.status(500).send(twiml.toString());
  }
}
