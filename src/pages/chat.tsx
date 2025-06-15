'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Card, CardContent, CardHeader } from '@/components/card';
import { Separator } from '@/components/separator';
import { ScrollArea } from '@/components/scroll-area';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Send,
  Bot,
  User,
  Volume2,
  Mic,
  MicOff
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/lib/chat';

export default function ChatPage() {
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load any saved conversation once
  useEffect(() => {
    fetch(`/api/get-conversation?sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages ?? []);
      })
      .catch(() => {
        setMessages([]); // on error, start fresh
      });
  }, [sessionId]);

  const startCall = () => {
    setIsCallActive(true);
    setMessages([
      {
        role: 'system',
        content:
          "Hello! I'm Guru, your AI assistant for council services. Ask me anything, or tell me what you need."
      }
    ]);
  };

  const endCall = () => {
    setIsCallActive(false);
    setInput('');
    setMessages([]);
  };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // add user message (explicitly type as ChatMessage[])
    const newMsgs: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed }
    ];
    setMessages(newMsgs);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/call-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages: newMsgs })
      });
      const data = await response.json();
      setMessages(data.messages ?? newMsgs);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error, please try again.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center border-b">
              <div className="flex items-center justify-center space-x-4">
                {isCallActive ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Phone className="h-5 w-5" />
                    <span>Connected to Guru</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <PhoneOff className="h-5 w-5" />
                    <span>Ready to Connect</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96 p-4">
                {/* Show placeholder when no messages and not started */}
                {(messages ?? []).length === 0 && !isCallActive && (
                  <div className="text-center text-gray-500 py-20">
                    <PhoneCall className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Click “Start Call” to chat with Guru</p>
                  </div>
                )}

                {/* Chat messages */}
                <div className="space-y-4">
                  {(messages ?? []).map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex items-start space-x-2 max-w-[80%] ${
                          msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2">
                        <div className="p-2 rounded-full bg-gray-200">
                          <Bot className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </ScrollArea>
              <Separator />

              {/* Controls */}
              <div className="p-4">
                {!isCallActive ? (
                  <div className="text-center">
                    <Button
                      onClick={startCall}
                      size="lg"
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      <PhoneCall className="mr-2 h-5 w-5" />
                      Start Call
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={sendMessage} className="space-y-3">
                    <div className="flex space-x-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) sendMessage();
                        }}
                        placeholder="Type your message…"
                        disabled={!isCallActive || isTyping}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isTyping}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMuted((m) => !m)}
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="destructive" size="sm" onClick={endCall}>
                        <PhoneOff className="mr-2 h-4 w-4" />
                        End Call
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
