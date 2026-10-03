// src/app/setup/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/ToastProvider';
import styles from '../plan/page.module.css';

export default function SetupPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [subjectInput, setSubjectInput] = useState('');
  const [topics, setTopics] = useState<Array<{ name: string; confidence: 'Low' | 'Medium' | 'High' }>>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfidenceChange = (index: number, conf: 'Low' | 'Medium' | 'High') => {
    setTopics((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], confidence: conf };
      return copy;
    });
  };

  const handleAddTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;
    if (topics.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Topic already added.');
      return;
    }
    setTopics((prev) => [...prev, { name: trimmed, confidence: 'Medium' }]);
    setNewTopicName('');
  };

  const handleRemoveTopic = (index: number) => {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topics.length === 0) {
      showToast('Please add at least one topic to build your plan.');
      return;
    }

    setIsLoading(true);
    try {
      const confidenceMap: Record<string, string> = {};
      topics.forEach((t) => {
        confidenceMap[t.name] = t.confidence;
      });

      const effectiveSubject = subjectInput.trim() || 'General Studies';
      const res = await apiClient.createPlan({
        examDate,
        hoursPerDay: Number(hoursPerDay),
        subjects: effectiveSubject.split(',').map((s) => s.trim()).filter(Boolean),
        topics: topics.map((t) => t.name),
        confidence: confidenceMap,
      });

      if (res && res.days && res.days.length > 0) {
        showToast('Study plan generated!');
        router.push('/plan');
      } else {
        showToast("Lucent couldn't build your plan right now. Try again.");
      }
    } catch {
      showToast("Lucent couldn't build your plan right now. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Setup Your Plan</h1>
        <p className={styles.desc}>
          Tell Lucent about your exam, available hours, and confidence. We will build a balanced schedule.
        </p>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Building your plan...</div>
          <p className={styles.loadingSub}>
            Lucent is balancing exam urgency, daily study hours, and confidence levels.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.setupCard} style={{ maxWidth: '640px' }}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Exam Date</label>
              <input
                type="date"
                required
                className={styles.formInput}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Available Hours / Day</label>
              <input
                type="number"
                min="1"
                max="12"
                step="0.5"
                required
                className={styles.formInput}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.inputLabel}>Subject</label>
            <input
              type="text"
              required
              className={styles.formInput}
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="e.g. Mathematics"
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.inputLabel}>Topics & Confidence Levels</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {topics.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--stone)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                  No topics added yet. Add your exam topics below to calibrate confidence levels.
                </div>
              )}
              {topics.map((t, index) => (
                <div key={t.name} className={styles.topicRowItem}>
                  <span className={styles.topicName}>{t.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={styles.confSelector}>
                      {(['Low', 'Medium', 'High'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`${styles.confBtn} ${
                            t.confidence === level
                              ? level === 'Low'
                                ? styles.confBtnActiveLow
                                : level === 'Medium'
                                ? styles.confBtnActiveMedium
                                : styles.confBtnActiveHigh
                              : ''
                          }`}
                          onClick={() => handleConfidenceChange(index, level)}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    {topics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(index)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--stone)', fontSize: '14px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                className={styles.formInput}
                style={{ flex: 1 }}
                placeholder="Add topic"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className={styles.secondaryBtn}
              >
                + Add
              </button>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.primaryBtn}
            >
              Build My Plan →
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
