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

interface AdaptationDetails {
  noticed: string;
  reason: string;
  topic: string;
  status: 'understood' | 'needs_practice' | 'struggled';
  beforeSessions: SessionItem[];
  afterSessions: SessionItem[];
}

interface ActiveSessionData {
  sessionId: string;
  subject: string;
  topic: string;
  duration: number;
  type: 'Learn' | 'Practice' | 'Revision';
  dayDate: string;
}

export default function PlanPage() {
  const { showToast } = useToast();
  const { subjects: courseSubjects } = useLucent();

  // Plan state
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Active Session & Adaptation Flow
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'session' | 'feedback' | 'adaptation'>('none');
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationData, setAdaptationData] = useState<AdaptationDetails | null>(null);

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
        if ((data as any).adaptation) {
          setAdaptationData((data as any).adaptation);
        }
      } else {
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

  // Launch Study Session Modal
  const startSession = (session: SessionItem, dayDate: string, sIndex: number) => {
    const sessionId = `${dayDate}_${session.topic}_${sIndex}`;
    setActiveSession({
      sessionId,
      subject: session.subject,
      topic: session.topic,
      duration: session.duration,
      type: session.type,
      dayDate,
    });
    setActiveModal('session');
  };

  // Finish session -> Go to Feedback
  const handleCompleteSession = () => {
    setActiveModal('feedback');
  };

  // Student selects feedback -> trigger POST /api/feedback & POST /api/adapt
  const handleFeedbackSelect = async (status: 'understood' | 'needs_practice' | 'struggled') => {
    if (!activeSession) return;

    setIsAdapting(true);
    try {
      // 1. POST /api/feedback
      await apiClient.submitFeedback({
        sessionId: activeSession.sessionId,
        subject: activeSession.subject,
        topic: activeSession.topic,
        status,
      });

      // 2. Mark session completed locally
      setCompletedSessions((prev) => ({
        ...prev,
        [activeSession.sessionId]: true,
      }));

      // 3. POST /api/adapt
      const diffMs = new Date(examDate).getTime() - Date.now();
      const daysRemaining = Math.max(1, Math.ceil(diffMs / 86400000));

      const adaptRes = await apiClient.adaptPlan({
        currentPlan: plan,
        completedSession: {
          sessionId: activeSession.sessionId,
          subject: activeSession.subject,
          topic: activeSession.topic,
          duration: activeSession.duration,
          type: activeSession.type,
        },
        feedback: status,
        daysRemaining,
        hoursPerDay: Number(hoursPerDay),
      });

      if (adaptRes && adaptRes.days && adaptRes.days.length > 0) {
        setPlan({
          summary: adaptRes.summary,
          days: adaptRes.days,
        });

        if (adaptRes.adaptation) {
          setAdaptationData(adaptRes.adaptation as AdaptationDetails);
        }

        // 4. Show Adaptation Screen
        setActiveModal('adaptation');
        showToast('Plan adapted based on your performance!');
      } else {
        setActiveModal('none');
        showToast('Feedback recorded.');
      }
    } catch (err: any) {
      console.error('Feedback & adaptation failed:', err);
      showToast("Lucent couldn't adapt your plan right now. Try again.");
      setActiveModal('none');
    } finally {
      setIsAdapting(false);
    }
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
              Adaptive daily schedule calibrated to exam urgency, available time, and feedback loop.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {adaptationData && (
              <button
                onClick={() => setActiveModal('adaptation')}
                className={styles.secondaryBtn}
                style={{ padding: '8px 14px', fontSize: '13px', borderColor: 'var(--ink)' }}
              >
                ✨ View Adaptation
              </button>
            )}
            <button
              onClick={() => setShowSetup(!showSetup)}
              className={styles.secondaryBtn}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              {showSetup ? 'View Plan' : 'Setup / Configure'}
            </button>
            <button
              onClick={handleGeneratePlan}
              disabled={isLoading || isAdapting}
              className={styles.primaryBtn}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <span>↻</span>&nbsp;
              <span>{isLoading ? 'Building...' : 'Regenerate Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading state for Plan Generation */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.summaryLabel}>Lucent Adaptive Strategy</div>
                {adaptationData && (
                  <button
                    onClick={() => setActiveModal('adaptation')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      color: 'var(--ink)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    View Diff Details
                  </button>
                )}
              </div>
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
                          style={{
                            opacity: isDone ? 0.6 : 1,
                          }}
                        >
                          <div
                            className={styles.taskLeft}
                            onClick={() => toggleSession(sessionKey)}
                            style={{ cursor: 'pointer' }}
                          >
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
                              <div
                                className={styles.taskTitle}
                                style={{
                                  textDecoration: isDone ? 'line-through' : 'none',
                                }}
                              >
                                {session.topic}
                              </div>
                              <div className={styles.taskMeta}>
                                {session.subject} · {session.duration} mins
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={`${styles.activityBadge} ${getActivityClass(session.type)}`}>
                              {session.type}
                            </span>
                            <button
                              onClick={() => startSession(session, day.date, sIndex)}
                              className={styles.sessionActionBtn}
                            >
                              {isDone ? 'Review' : 'Start'}
                            </button>
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

              <div className={styles.tipCard}>
                <div className={styles.cardLabel}>ADAPTIVE STUDY LOOP</div>
                <p className={styles.tipText} style={{ fontSize: '12px' }}>
                  <strong>PLAN → STUDY → FEEDBACK → ADAPT</strong><br />
                  Complete a session and give quick feedback to see Lucent adjust upcoming days automatically.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* ========================================================
          STUDY SESSION MODAL (Screen 1: Study)
         ======================================================== */}
      {activeModal === 'session' && activeSession && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal('none')}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTag}>STUDY SESSION</div>
            <h2 className={styles.modalTitle}>{activeSession.topic}</h2>
            <p className={styles.modalSubtitle}>
              Focus on mastering key concepts, solving problems, and taking notes.
            </p>

            <div className={styles.sessionDetails}>
              <div className={styles.sessionRow}>
                <span className={styles.sessionLabel}>Subject</span>
                <span className={styles.sessionValue}>{activeSession.subject}</span>
              </div>
              <div className={styles.sessionRow}>
                <span className={styles.sessionLabel}>Activity Type</span>
                <span className={`${styles.activityBadge} ${getActivityClass(activeSession.type)}`}>
                  {activeSession.type}
                </span>
              </div>
              <div className={styles.sessionRow}>
                <span className={styles.sessionLabel}>Target Duration</span>
                <span className={styles.sessionValue}>{activeSession.duration} minutes</span>
              </div>
              <div className={styles.sessionRow}>
                <span className={styles.sessionLabel}>Scheduled Date</span>
                <span className={styles.sessionValue}>{activeSession.dayDate}</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className={styles.secondaryBtn}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                className={styles.primaryBtn}
              >
                Complete Session & Give Feedback →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FEEDBACK MODAL (Screen 2: Feedback)
         ======================================================== */}
      {activeModal === 'feedback' && activeSession && (
        <div className={styles.modalOverlay} onClick={() => !isAdapting && setActiveModal('none')}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTag}>SESSION FEEDBACK</div>
            <h2 className={styles.modalTitle}>How did that feel?</h2>
            <p className={styles.modalSubtitle}>
              Lucent uses your performance to calibrate future study time and activity types.
            </p>

            {isAdapting ? (
              <div className={styles.loadingContainer} style={{ padding: '36px 0' }}>
                <div className={styles.loadingSpinner} />
                <div className={styles.loadingText}>Adapting your study plan...</div>
                <p className={styles.loadingSub}>
                  Recalculating topic priorities and session durations to match your performance.
                </p>
              </div>
            ) : (
              <div className={styles.feedbackGrid}>
                {/* 1. Got it -> understood */}
                <button
                  type="button"
                  onClick={() => handleFeedbackSelect('understood')}
                  className={styles.feedbackOption}
                >
                  <div>
                    <div className={styles.feedbackOptionTitle}>
                      <span>✓</span> Got it
                    </div>
                    <div className={styles.feedbackOptionDesc}>
                      Understood clearly. Reduce repetitive review and shift toward practice & revision.
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--sage)' }}>→</span>
                </button>

                {/* 2. Need more practice -> needs_practice */}
                <button
                  type="button"
                  onClick={() => handleFeedbackSelect('needs_practice')}
                  className={styles.feedbackOption}
                >
                  <div>
                    <div className={styles.feedbackOptionTitle}>
                      <span>⚡</span> Need more practice
                    </div>
                    <div className={styles.feedbackOptionDesc}>
                      Understood the basics, but need more hands-on exercises and problem solving.
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--honey)' }}>→</span>
                </button>

                {/* 3. I'm stuck -> struggled */}
                <button
                  type="button"
                  onClick={() => handleFeedbackSelect('struggled')}
                  className={styles.feedbackOption}
                >
                  <div>
                    <div className={styles.feedbackOptionTitle}>
                      <span>⚠️</span> I&apos;m stuck
                    </div>
                    <div className={styles.feedbackOptionDesc}>
                      Difficult topic. Needs another pass with additional learning time and review.
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--rose)' }}>→</span>
                </button>
              </div>
            )}

            {!isAdapting && (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  onClick={() => setActiveModal('session')}
                  className={styles.secondaryBtn}
                >
                  ← Back to Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          ADAPTATION SCREEN (Screen 3: Adaptation Before vs After)
         ======================================================== */}
      {activeModal === 'adaptation' && adaptationData && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal('none')}>
          <div className={styles.adaptationModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTag}>ADAPTATION COMPLETED</div>
            <h2 className={styles.modalTitle}>Plan Adapted to Your Performance</h2>
            <p className={styles.modalSubtitle}>
              Lucent observed your feedback and dynamically recalculated future sessions.
            </p>

            {/* 1. What Lucent noticed & 2. Why the plan changed */}
            <div className={styles.adaptationBannerNotice}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone)' }}>
                  1. What Lucent Noticed
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      adaptationData.status === 'struggled'
                        ? 'rgba(168, 88, 96, 0.12)'
                        : adaptationData.status === 'needs_practice'
                        ? 'rgba(184, 146, 74, 0.12)'
                        : 'rgba(122, 145, 117, 0.12)',
                    color:
                      adaptationData.status === 'struggled'
                        ? 'var(--rose)'
                        : adaptationData.status === 'needs_practice'
                        ? 'var(--honey)'
                        : 'var(--sage)',
                  }}
                >
                  Status: {adaptationData.status.replace('_', ' ')}
                </span>
              </div>
              <div className={styles.adaptationNoticeHeadline}>{adaptationData.noticed}</div>

              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone)', display: 'block', marginBottom: '2px' }}>
                  2. Why The Plan Changed
                </span>
                <div className={styles.adaptationNoticeReason}>{adaptationData.reason}</div>
              </div>
            </div>

            {/* 3. BEFORE PLAN vs 4. AFTER PLAN Comparison */}
            <div className={styles.comparisonGrid}>
              {/* BEFORE CARD */}
              <div className={styles.comparisonCard}>
                <div className={styles.comparisonCardHeader}>
                  <span className={styles.comparisonCardTitle}>3. Before Plan</span>
                  <span style={{ fontSize: '11px', color: 'var(--stone)' }}>
                    Total: {adaptationData.beforeSessions.reduce((sum, s) => sum + s.duration, 0)} min
                  </span>
                </div>
                <div className={styles.comparisonSessionList}>
                  {adaptationData.beforeSessions.map((s, idx) => (
                    <div key={`before_${idx}`} className={styles.comparisonSessionItem}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{s.topic}</div>
                        <div style={{ fontSize: '11px', color: 'var(--stone)' }}>{s.subject} · {s.type}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clay)' }}>
                        {s.duration} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AFTER CARD */}
              <div className={styles.comparisonCardAdapted}>
                <div className={styles.comparisonCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={styles.comparisonCardTitle} style={{ color: 'var(--ink)' }}>
                      4. After Plan (Adapted)
                    </span>
                    <span
                      style={{
                        background: 'var(--ink)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 600,
                      }}
                    >
                      NEW
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                    Total: {adaptationData.afterSessions.reduce((sum, s) => sum + s.duration, 0)} min
                  </span>
                </div>

                <div className={styles.comparisonSessionList}>
                  {adaptationData.afterSessions.map((s, idx) => {
                    const beforeMatch = adaptationData.beforeSessions.find(
                      (b) => b.topic.toLowerCase() === s.topic.toLowerCase()
                    );
                    const diff = beforeMatch ? s.duration - beforeMatch.duration : s.duration;

                    return (
                      <div key={`after_${idx}`} className={styles.comparisonSessionItem}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{s.topic}</div>
                          <div style={{ fontSize: '11px', color: 'var(--stone)' }}>{s.subject} · {s.type}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                            {s.duration} min
                          </span>
                          {diff > 0 && (
                            <span className={styles.deltaBadgePlus}>
                              +{diff}m
                            </span>
                          )}
                          {diff < 0 && (
                            <span className={styles.deltaBadgeMinus}>
                              {diff}m
                            </span>
                          )}
                          {diff === 0 && (
                            <span className={styles.deltaBadgeNeutral}>
                              =
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className={styles.primaryBtn}
              >
                Apply & Continue Studying →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
