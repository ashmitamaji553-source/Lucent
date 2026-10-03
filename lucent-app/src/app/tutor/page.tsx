'use client';
import { useState, useRef, useEffect } from 'react';
import { mockChatMessages, mockFiles } from '@/lib/mockData';
import { ChatMessage } from '@/lib/types';
import styles from './page.module.css';

function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`${styles.message} ${isUser ? styles.userMsg : styles.assistantMsg}`}>
      {!isUser && (
        <div className={styles.msgAvatar}>L</div>
      )}
      <div className={styles.msgContent}>
        <p className={styles.msgText}>{msg.content}</p>
        {msg.sources && (
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
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        default: `Based on your uploaded materials, here's what I found about "${text}":\n\nThis topic appears in your Data Structures syllabus and is covered in Unit 3 Notes. The 2024 PYQ paper had 2 questions related to this concept. I'd recommend reviewing the recursive implementation and time complexity analysis.`,
      };

      const reply: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: responses.default,
        sources: ['Unit 3 Notes', 'PYQ_2024.pdf', 'DS_Syllabus.pdf'],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, reply]);
      setIsTyping(false);
    }, 1400);
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
            <div className={styles.contextPath}>Data Structures → Trees → AVL Trees</div>
          </div>

          <div className={styles.contextSection}>
            <div className={styles.sectionLabel}>Based on your materials</div>
            {mockFiles.slice(0, 3).map(f => (
              <div key={f.id} className={styles.sourceFile}>
                <div className={styles.fileIcon}>PDF</div>
                <span>{f.name}</span>
              </div>
            ))}
          </div>

          <div className={styles.contextSection}>
            <div className={styles.sectionLabel}>Suggested Questions</div>
            {[
              'Explain AVL tree rotations',
              'What topics from PYQ 2024 do I need to review?',
              'How is normalization tested in DBMS?',
            ].map((q) => (
              <button
                key={q}
                className={styles.suggestion}
                onClick={() => setInput(q)}
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
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {isTyping && (
              <div className={`${styles.message} ${styles.assistantMsg}`}>
                <div className={styles.msgAvatar}>L</div>
                <div className={styles.typing}>
                  <span /><span /><span />
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
            />
            <button
              className={styles.sendBtn}
              onClick={send}
              disabled={!input.trim()}
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
