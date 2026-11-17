import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ShieldAlert } from 'lucide-react';
import { buildContextualCoachSuggestions } from '../domain/coachAssistant';
import { CoachChatMessage, UserProfile } from '../domain/types';

interface CoachChatTabProps {
  profile: UserProfile;
  messages: CoachChatMessage[];
  onSendMessage: (text: string) => void;
}

export const CoachChatTab: React.FC<CoachChatTabProps> = ({ profile, messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = useMemo(() => buildContextualCoachSuggestions(profile), [profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] min-h-[460px]">
      <h1 className="text-[22px] font-bold text-ink-900 mb-3">โค้ช</h1>

      <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1" role="log" aria-label="บทสนทนากับโค้ช">
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <p className="max-w-[82%] rounded-3xl rounded-br-md bg-sage-600 text-white px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-line">
                  {msg.text}
                </p>
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex justify-start">
              <div
                className={`max-w-[88%] rounded-3xl rounded-bl-md px-3.5 py-2.5 space-y-1 ${
                  msg.safetyTriggered ? 'glass-alert-critical text-berry-800' : 'glass-card text-ink-900'
                }`}
              >
                {msg.badge && (
                  <p
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      msg.safetyTriggered ? 'text-berry-600' : 'text-sage-700'
                    }`}
                  >
                    {msg.safetyTriggered && <ShieldAlert className="w-3.5 h-3.5" />}
                    {msg.badge}
                  </p>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto py-2 -mx-4 px-4 [scrollbar-width:none]">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSendMessage(prompt)}
            className="tactile-btn shrink-0 h-8 rounded-full glass-pill px-3 text-sm text-ink-700"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความ"
          aria-label="พิมพ์ข้อความ"
          className="flex-1 min-w-0 h-11 rounded-full glass-input px-4 text-base text-ink-900"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="ส่งข้อความ"
          className="tactile-btn w-11 h-11 rounded-full glass-btn-primary disabled:opacity-40 flex items-center justify-center shrink-0"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
