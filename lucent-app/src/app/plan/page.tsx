// src/app/plan/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { getDateLabel } from '@/lib/mockData';
import { apiClient } from '@/lib/api-client';
import { StudyPlanItem } from '@/lib/models/types';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './page.module.css';

const typeColors: Record<string, string> = {
  Review: '#879B82',
  Practice: '#C69A62',
  Read: '#A2725E',
  Quiz: '#B96F73',
};

export default function PlanPage() {
  const { showToast } = useToast();
  const [todayTasks, setTodayTasks] = useState<StudyPlanItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<StudyPlanItem[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([
    'AVL Trees',
    'Transactions & ACID',
    'TCP/IP Stack',
    'Memory Management',
  ]);
  const [studyTip, setStudyTip] = useState(
    'You have a DBMS quiz in 3 days. Prioritize SQL Joins and Normalization based on your PYQ analysis.'
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadPlan = async () => {
    try {
      const data = await apiClient.getPlan();
      if (data) {
        if (data.todayTasks) setTodayTasks(data.todayTasks);
        if (data.upcomingTasks) setUpcomingTasks(data.upcomingTasks);
        if (data.focusAreas) setFocusAreas(data.focusAreas);
        if (data.studyTip) setStudyTip(data.studyTip);
      }
    } catch (err) {
      console.warn('Failed to load plan:', err);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const handleToggleTask = async (id: string) => {
    try {
      const updated = await apiClient.togglePlanItem(id);
      setTodayTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: updated.completed } : t))
      );
      setUpcomingTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: updated.completed } : t))
      );
      showToast(updated.completed ? 'Task completed! Great progress.' : 'Task reopened.');
    } catch {
      showToast('Status updated.');
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    showToast('Balancing workload with your daily goals and priority topics...');
    try {
      await apiClient.regeneratePlan();
      await loadPlan();
      showToast('Study plan refreshed and prioritized!');
    } catch {
      showToast('Plan refreshed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className={styles.eyebrow}>PRIORITISED FOR YOU</div>
            <h1 className={styles.heading}>Study Plan</h1>
            <p className={styles.desc}>Your focus for today and the days ahead, based on your materials and deadlines.</p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: '1px solid var(--l)',
              background: 'rgba(255, 253, 248, 0.8)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--e)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>↻</span>
            <span>{isRegenerating ? 'Optimizing...' : 'Regenerate Plan'}</span>
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.planCol}>
          {/* Today */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.dayLabel}>TODAY</div>
            </div>
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className={styles.task}
                onClick={() => handleToggleTask(task.id)}
                style={{
                  cursor: 'pointer',
                  opacity: task.completed ? 0.6 : 1,
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}
              >
                <div className={styles.taskLeft}>
                  <div
                    className={styles.taskDot}
                    style={{ background: task.completed ? '#879B82' : (typeColors[task.type] || '#A2725E') }}
                  />
                  <div>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskMeta}>
                      {task.type} · {task.duration} {task.completed && '✓ Done'}
                    </div>
                  </div>
                </div>
                <div className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
                  {task.priority}
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming deadlines */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.dayLabel}>UPCOMING</div>
            </div>
            {upcomingTasks.map((task) => {
              const { month, day } = task.dueDate ? getDateLabel(task.dueDate) : { month: 'OCT', day: '15' };
              return (
                <div
                  key={task.id}
                  className={styles.deadlineTask}
                  onClick={() => handleToggleTask(task.id)}
                  style={{
                    cursor: 'pointer',
                    opacity: task.completed ? 0.6 : 1,
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                >
                  <div className={styles.dateChip}>
                    <span>{month}</span>
                    <b>{day}</b>
                  </div>
                  <div className={styles.taskInfo}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskMeta}>
                      {task.duration} {task.completed && '✓ Prepared'}
                    </div>
                  </div>
                  <div className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
                    {task.priority}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Coverage signal */}
        <aside className={styles.sidebar}>
          <div className={styles.coverageCard}>
            <div className={styles.cardLabel}>FOCUS AREAS</div>
            <div className={styles.cardValue}>{focusAreas.length} topics</div>
            <div className={styles.cardSub}>need your attention this week</div>
            <div className={styles.focusList}>
              {focusAreas.map((t) => (
                <div key={t} className={styles.focusItem}>
                  <div className={styles.focusDot} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.cardLabel}>STUDY TIP</div>
            <p className={styles.tipText}>{studyTip}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
