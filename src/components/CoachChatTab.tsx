import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, ShieldAlert, Sparkles, User } from 'lucide-react';
import { buildContextualCoachSuggestions } from '../domain/coachAssistant';
import { CoachChatMessage, UserProfile } from '../domain/types';

interface CoachChatTabProps {
  profile: UserProfile;
  messages: CoachChatMessage[];
  onSendMessage: (text: string) => void;
}

export const CoachChatTab: React.FC<CoachChatTabProps> = ({
  profile,
  messages,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = useMemo(
    () => buildContextualCoachSuggestions(profile),
    [profile]
  );

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
    <div className="flex flex-col h-[calc(100dvh-11.2rem)] min-h-[470px]">
      <h1 className="text-xl font-bold text-ink-900 mb-3">โค้ช AI</h1>

      <div className="flex-1 overflow-y-auto rounded-3xl glass-card p-3.5 space-y-3 animate-card-rise stagger-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end gap-2 animate-list-item">
                <div className="max-w-[82%] rounded-3xl rounded-br-md glass-btn-primary px-3.5 py-2.5 text-sm leading-relaxed">
                  {msg.text}
                </div>
                <span className="w-7 h-7 rounded-full bg-peach-100 text-peach-600 inline-flex items-center justify-center shrink-0 self-end">
                  <User className="w-3.5 h-3.5" />
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start gap-2 animate-list-item">
              <span className="w-7 h-7 rounded-full bg-sage-100 text-sage-600 inline-flex items-center justify-center shrink-0 self-start mt-0.5">
                <Bot className="w-4 h-4" />
              </span>
              <div
                className={`max-w-[85%] rounded-3xl rounded-tl-md p-3.5 text-sm leading-relaxed space-y-1.5 ${
                  msg.safetyTriggered
                    ? 'glass-alert-critical text-berry-800'
                    : 'glass-subtle text-ink-900'
                }`}
              >
                {msg.badge && (
                  <div className="inline-flex items-center gap-1 rounded-full glass-pill px-2.5 py-0.5 text-[11px] font-bold text-sage-700">
                    {msg.safetyTriggered ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-berry-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-sage-600" />
                    )}
                    <span className={msg.safetyTriggered ? 'text-berry-800' : 'text-sage-700'}>
                      {msg.badge}
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-line text-xs sm:text-sm">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto py-2.5">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSendMessage(prompt)}
            className="tactile-btn shrink-0 rounded-full glass-pill px-3 py-1.5 text-xs font-medium text-ink-900"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          aria-label="พิมพ์ข้อความ"
          className="flex-1 min-h-[46px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="ส่งข้อความ"
          className="tactile-btn min-h-[46px] min-w-[46px] rounded-2xl glass-btn-primary disabled:opacity-50 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
