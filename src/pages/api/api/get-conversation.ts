// src/pages/api/get-conversation.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/lib/chat';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query as { sessionId: string };
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('messages')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('GET conversation error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ messages: (data?.messages as ChatMessage[]) ?? [] });
}
