import { mockStudyTasks, mockDeadlines, getDaysUntil, getDateLabel } from '@/lib/mockData';
import styles from './page.module.css';

const typeColors: Record<string, string> = {
  Review: '#879B82',
  Practice: '#C69A62',
  Read: '#A2725E',
  Quiz: '#B96F73',
};

export default function PlanPage() {
  const todayTasks = mockStudyTasks.filter(t => !t.dueDate);
  const upcomingTasks = mockStudyTasks.filter(t => t.dueDate);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>PRIORITISED FOR YOU</div>
        <h1 className={styles.heading}>Study Plan</h1>
        <p className={styles.desc}>Your focus for today and the days ahead, based on your materials and deadlines.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.planCol}>
          {/* Today */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.dayLabel}>TODAY</div>
            </div>
            {todayTasks.map(task => (
              <div key={task.id} className={styles.task}>
                <div className={styles.taskLeft}>
                  <div
                    className={styles.taskDot}
                    style={{ background: typeColors[task.type] || '#A2725E' }}
                  />
                  <div>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskMeta}>{task.type} · {task.duration}</div>
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
            {upcomingTasks.map(task => {
              const dl = mockDeadlines.find(d => d.title === task.title);
              const { month, day } = dl ? getDateLabel(dl.date) : { month: '', day: '' };
              return (
                <div key={task.id} className={styles.deadlineTask}>
                  {dl && (
                    <div className={styles.dateChip}>
                      <span>{month}</span>
                      <b>{day}</b>
                    </div>
                  )}
                  <div className={styles.taskInfo}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskMeta}>{task.duration}</div>
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
            <div className={styles.cardValue}>4 topics</div>
            <div className={styles.cardSub}>need your attention this week</div>
            <div className={styles.focusList}>
              {['AVL Trees', 'Transactions & ACID', 'TCP/IP Stack', 'Memory Management'].map(t => (
                <div key={t} className={styles.focusItem}>
                  <div className={styles.focusDot} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.tipCard}>
            <div className={styles.cardLabel}>STUDY TIP</div>
            <p className={styles.tipText}>
              You have a DBMS quiz in 3 days. Prioritize SQL Joins and Normalization based on your PYQ analysis.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
