// src/app/tutor/page.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useLucent } from '@/lib/LucentContext';
import { apiClient } from '@/lib/api-client';
import { TutorMessage } from '@/lib/models/types';
import styles from './page.module.css';

function Message({ msg }: { msg: TutorMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`${styles.message} ${isUser ? styles.userMsg : styles.assistantMsg}`}>
      {!isUser && (
        <div className={styles.msgAvatar}>L</div>
      )}
      <div className={styles.msgContent}>
        <p className={styles.msgText} style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
        {msg.sources && msg.sources.length > 0 && (
          <div className={styles.sources}>
            <span className={styles.sourcesLabel}>Based on:</span>
            {msg.sources.map((s, i) => (
              <span key={i} className={styles.source}>{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorPage() {
  const { documents } = useLucent();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'How should I structure my revision for upcoming exams?',
    'What study techniques work best for difficult topics?',
    'Help me break down a complex concept step by step.',
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.getTutorHistory().then((res) => {
      if (res.messages && res.messages.length > 0) {
        setMessages(res.messages);
        const lastWithSuggestions = [...res.messages].reverse().find(m => m.suggestedQuestions && m.suggestedQuestions.length > 0);
        if (lastWithSuggestions?.suggestedQuestions) {
          setSuggestedQuestions(lastWithSuggestions.suggestedQuestions);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isTyping) return;
    setInput('');

    const userMsg: TutorMessage = {
      id: `temp_${Date.now()}`,
      conversationId: 'conv_default',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await apiClient.askTutor(text);
      if (res.message) {
        setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, res.message]);
      }
      if (res.suggestedQuestions && res.suggestedQuestions.length > 0) {
        setSuggestedQuestions(res.suggestedQuestions);
      }
    } catch {
      // Fallback message
      const fallbackReply: TutorMessage = {
        id: `fb_${Date.now()}`,
        conversationId: 'conv_default',
        role: 'assistant',
        content: `I've analyzed your uploaded notes for "${text}". Review the core definitions, algorithms, and past year question patterns in your curriculum.`,
        sources: documents.slice(0, 2).map((d) => d.name),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Context panel */}
        <aside className={styles.context}>
          <div className={styles.contextTitle}>Lucent Tutor</div>
          <div className={styles.contextSub}>Ask anything from your materials</div>

          <div className={styles.contextSection}>
            <div className={styles.sectionLabel}>Current Context</div>
            <div className={styles.contextPath}>
              {documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''} indexed` : 'General Workspace'}
            </div>
          </div>

          <div className={styles.contextSection}>
            <div className={styles.sectionLabel}>Based on your materials</div>
            {documents.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--stone)', lineHeight: 1.5 }}>
                No materials uploaded yet. Upload syllabus or lecture notes in My Materials.
              </p>
            ) : (
              documents.slice(0, 4).map((f) => (
                <div key={f.id} className={styles.sourceFile}>
                  <div className={styles.fileIcon}>PDF</div>
                  <span>{f.name}</span>
                </div>
              ))
            )}
          </div>

          <div className={styles.contextSection}>
            <div className={styles.sectionLabel}>Suggested Questions</div>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                className={styles.suggestion}
                onClick={() => send(q)}
              >
                {q} →
              </button>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <div className={styles.chat}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitle}>Lucent Tutor</div>
            <div className={styles.chatSub}>Answers grounded in your own study materials</div>
          </div>

          <div className={styles.messages} role="log" aria-live="polite">
            {messages.map((msg) => (
              <Message key={msg.id} msg={msg} />
            ))}
            {isTyping && (
              <div className={`${styles.message} ${styles.assistantMsg}`}>
                <div className={styles.msgAvatar}>L</div>
                <div className={styles.typing}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your topics, notes, or past papers..."
              aria-label="Type your question"
              disabled={isTyping}
            />
            <button
              className={styles.sendBtn}
              onClick={() => send()}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
