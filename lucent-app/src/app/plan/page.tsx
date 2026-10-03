// src/app/plan/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/ToastProvider';
import { useLucent } from '@/lib/LucentContext';
import styles from './page.module.css';

interface SessionItem {
  subject: string;
  topic: string;
  duration: number;
  type: 'Learn' | 'Practice' | 'Revision';
  completed?: boolean;
}

interface PlanDay {
  date: string;
  totalMinutes: number;
  sessions: SessionItem[];
}

interface AiPlan {
  summary: string;
  days: PlanDay[];
}

interface TopicConfidence {
  name: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export default function PlanPage() {
  const { showToast } = useToast();
  const { subjects: courseSubjects } = useLucent();

  // Plan state
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Setup form inputs
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [subjectInput, setSubjectInput] = useState('Mathematics');
  const [topics, setTopics] = useState<TopicConfidence[]>([
    { name: 'Probability', confidence: 'Low' },
    { name: 'Calculus', confidence: 'Medium' },
    { name: 'Algebra', confidence: 'High' },
  ]);
  const [newTopicName, setNewTopicName] = useState('');

  // Initial load: fetch active AI plan from server
  const loadPlan = async () => {
    try {
      const data = await apiClient.getPlan();
      if (data && data.days && data.days.length > 0) {
        setPlan({
          summary: data.summary || data.studyTip || 'Your personalized AI study plan.',
          days: data.days,
        });
      } else {
        // If no plan exists yet, trigger initial generation
        await handleGeneratePlan();
      }
    } catch (err) {
      console.warn('Failed to load plan:', err);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  // Update available topics from uploaded courses if available
  useEffect(() => {
    if (courseSubjects && courseSubjects.length > 0) {
      const firstCourse = courseSubjects[0];
      if (firstCourse.subject && subjectInput === 'Mathematics') {
        setSubjectInput(firstCourse.subject);
      }
    }
  }, [courseSubjects]);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    try {
      const confidenceMap: Record<string, string> = {};
      topics.forEach((t) => {
        confidenceMap[t.name] = t.confidence;
      });

      const response = await apiClient.createPlan({
        examDate,
        hoursPerDay: Number(hoursPerDay),
        subjects: subjectInput.split(',').map((s) => s.trim()).filter(Boolean),
        topics: topics.map((t) => t.name),
        confidence: confidenceMap,
      });

      if (response && response.days && response.days.length > 0) {
        setPlan({
          summary: response.summary,
          days: response.days,
        });
        setShowSetup(false);
        showToast('Study plan generated successfully!');
      } else {
        showToast("Lucent couldn't build your plan right now. Try again.");
      }
    } catch (err: any) {
      console.error('Plan generation failed:', err);
      showToast("Lucent couldn't build your plan right now. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSession = (key: string) => {
    setCompletedSessions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      showToast(next[key] ? 'Session completed! Great work.' : 'Session reopened.');
      return next;
    });
  };

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

  const getActivityClass = (type: string) => {
    if (type === 'Learn') return styles.activityLearn;
    if (type === 'Practice') return styles.activityPractice;
    return styles.activityRevision;
  };

  // Focus areas for the sidebar: lowest confidence topics first
  const focusAreas = topics
    .filter((t) => t.confidence === 'Low' || t.confidence === 'Medium')
    .map((t) => t.name);

  // Compute progress
  const allSessionsCount = plan ? plan.days.reduce((acc, d) => acc + d.sessions.length, 0) : 0;
  const completedCount = Object.values(completedSessions).filter(Boolean).length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.heading}>Study Plan</h1>
            <p className={styles.desc}>
              Adaptive daily schedule calibrated to exam urgency, available time, and confidence.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSetup(!showSetup)}
              className={styles.secondaryBtn}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              {showSetup ? 'View Plan' : 'Setup / Configure'}
            </button>
            <button
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className={styles.primaryBtn}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <span>↻</span>&nbsp;
              <span>{isLoading ? 'Building...' : 'Regenerate Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>Building your plan...</div>
          <p className={styles.loadingSub}>
            Lucent is balancing exam urgency, daily study hours, and confidence levels.
          </p>
        </div>
      )}

      {/* Setup Form View */}
      {showSetup && !isLoading && (
        <section className={styles.setupCard}>
          <h2 className={styles.setupTitle}>Study Plan Setup</h2>
          <p className={styles.setupDesc}>
            Configure your exam target, available study time, and confidence across core topics.
          </p>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Exam Date</label>
              <input
                type="date"
                className={styles.formInput}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Available Study Time (Hours / Day)</label>
              <input
                type="number"
                min="1"
                max="12"
                step="0.5"
                className={styles.formInput}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.inputLabel}>Course / Subject</label>
            <input
              type="text"
              className={styles.formInput}
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="e.g. Mathematics or Data Structures"
            />
          </div>

          <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.inputLabel}>Topics & Confidence Levels</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
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
                        title="Remove topic"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add new topic */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                className={styles.formInput}
                style={{ flex: 1 }}
                placeholder="Add topic (e.g. Graph Algorithms)"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className={styles.secondaryBtn}
                style={{ padding: '8px 14px' }}
              >
                + Add
              </button>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={() => setShowSetup(false)}
              className={styles.secondaryBtn}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGeneratePlan}
              className={styles.primaryBtn}
            >
              Build My Plan →
            </button>
          </div>
        </section>
      )}

      {/* Main Plan View */}
      {!isLoading && plan && (
        <>
          {/* AI Explanation Banner */}
          {plan.summary && (
            <div className={styles.summaryBanner}>
              <div className={styles.summaryLabel}>Lucent Adaptation Strategy</div>
              <p className={styles.summaryText}>{plan.summary}</p>
            </div>
          )}

          <div className={styles.layout}>
            {/* Left Column: Days & Sessions */}
            <div className={styles.planCol}>
              {plan.days.map((day, dayIndex) => {
                const isToday = dayIndex === 0;
                const formattedLabel = isToday ? 'TODAY' : day.date;
                const totalHours = (day.totalMinutes / 60).toFixed(1);

                return (
                  <div key={day.date} className={styles.section}>
                    <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={styles.dayLabel}>
                        {formattedLabel} · {day.date}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--stone)' }}>
                        {day.totalMinutes} MINS ({totalHours} HRS)
                      </span>
                    </div>

                    {day.sessions.map((session, sIndex) => {
                      const sessionKey = `${day.date}_${session.topic}_${sIndex}`;
                      const isDone = completedSessions[sessionKey] || false;

                      return (
                        <div
                          key={sessionKey}
                          className={styles.task}
                          onClick={() => toggleSession(sessionKey)}
                          style={{
                            cursor: 'pointer',
                            opacity: isDone ? 0.55 : 1,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          <div className={styles.taskLeft}>
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                border: '1px solid var(--sand)',
                                borderRadius: '4px',
                                background: isDone ? 'var(--ink)' : '#fff',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#fff',
                                fontSize: '11px',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              {isDone && '✓'}
                            </div>

                            <div>
                              <div className={styles.taskTitle}>
                                {session.topic}
                              </div>
                              <div className={styles.taskMeta}>
                                {session.subject} · {session.duration} mins
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`${styles.activityBadge} ${getActivityClass(session.type)}`}>
                              {session.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.coverageCard}>
                <div className={styles.cardLabel}>PLAN PROGRESS</div>
                <div className={styles.cardValue}>
                  {completedCount} / {allSessionsCount}
                </div>
                <div className={styles.cardSub}>sessions completed</div>
                <div
                  style={{
                    height: '6px',
                    background: 'var(--sand)',
                    borderRadius: '99px',
                    overflow: 'hidden',
                    marginTop: '8px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${allSessionsCount > 0 ? (completedCount / allSessionsCount) * 100 : 0}%`,
                      background: 'var(--ink)',
                      borderRadius: '99px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {focusAreas.length > 0 && (
                <div className={styles.coverageCard}>
                  <div className={styles.cardLabel}>PRIORITY FOCUS AREAS</div>
                  <div className={styles.focusList}>
                    {focusAreas.map((area) => (
                      <div key={area} className={styles.focusItem}>
                        <div className={styles.focusDot} />
                        <span>{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.tipCard}>
                <div className={styles.cardLabel}>DAILY TARGET</div>
                <p className={styles.tipText}>
                  Configured for <strong>{hoursPerDay} hours/day</strong>.
                  Never exceeds your available time.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
