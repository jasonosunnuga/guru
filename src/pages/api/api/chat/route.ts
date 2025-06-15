// src/pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/lib/chat';

// Force dynamic rendering so we can read/write to Supabase at runtime
export const dynamic = 'force-dynamic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1) Validate method
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    // 2) Parse body
    const { sessionId, messages: incoming } = req.body as {
      sessionId: string;
      messages:  ChatMessage[];
    };

    // 3) Build full message history
    const history: ChatMessage[] = incoming.length > 0
      ? incoming
      : [{
          role:    'system',
          content: 'You are Guru, a helpful council assistant.'
        }];

    // 4) Call OpenAI
    const completion = await openai.chat.completions.create({
      model:       'gpt-3.5-turbo',
      messages:    history as any,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message;
    if (!raw) throw new Error('OpenAI did not return any message');

    // 5) Construct assistant message
    const assistantMsg: ChatMessage = {
      role:    'assistant',
      content: raw.content ?? ''
    };
    const updated = [...history, assistantMsg];

    // 6) Determine a “topic” for this session (first user utterance)
    const firstUser = updated.find(m => m.role === 'user');
    const topic     = firstUser?.content.slice(0, 200) ?? '';

    // 7) Persist to Supabase
    const { error: upsertError } = await supabase
      .from('conversations')
      .upsert(
        {
          session_id: sessionId,
          topic,
          messages:   updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );
    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      // we log but do not block the user
    }

    // 8) Return updated conversation
    return res.status(200).json({ success: true, messages: updated });

  } catch (err: any) {
    console.error('CHAT API ERROR:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
