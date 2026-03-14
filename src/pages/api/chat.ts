import type { NextApiRequest, NextApiResponse } from 'next';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/lib/chat';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { sessionId, messages: incoming } = req.body as {
      sessionId: string;
      messages: ChatMessage[];
    };

    if (!sessionId || !incoming) {
      return res.status(400).json({ success: false, error: 'sessionId and messages required' });
    }

    const history: ChatMessage[] =
      incoming.length > 0
        ? incoming
        : [{ role: 'system', content: 'You are Guru, a helpful council assistant.' }];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: history as any,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message;
    if (!raw) throw new Error('OpenAI did not return any message');

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: raw.content ?? '',
    };
    const updated = [...history, assistantMsg];

    const firstUser = updated.find((m) => m.role === 'user');
    const topic = firstUser?.content.slice(0, 200) ?? '';

    if (supabase) {
      const { error: upsertError } = await supabase
        .from('conversations')
        .upsert(
          {
            session_id: sessionId,
            topic,
            messages: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        );
      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
      }
    }

    return res.status(200).json({ messages: updated });
  } catch (err: unknown) {
    console.error('CHAT API ERROR:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
