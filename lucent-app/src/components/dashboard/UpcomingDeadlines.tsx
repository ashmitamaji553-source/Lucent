'use client';
import { getDaysUntil, getDateLabel } from '@/lib/mockData';
import { useLucent } from '@/lib/LucentContext';
import styles from './UpcomingDeadlines.module.css';

export default function UpcomingDeadlines() {
  const { deadlines } = useLucent();

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.indexNum}>04</span>
          <span>CRITICAL TIMELINES</span>
        </div>
        <h2 className={styles.title}>Upcoming Deadlines</h2>
        <p className={styles.subtext}>Examinations, project submissions, and viva milestones.</p>
      </div>

      <div className={styles.list}>
        {deadlines.slice(0, 4).map((dl) => {
          const dateVal = (dl as any).dueDate || (dl as any).date;
          const { month, day } = getDateLabel(dateVal);
          const daysUntil = getDaysUntil(dateVal);
          return (
            <div key={dl.id} className={styles.deadlineItem}>
              <div className={styles.dateStamp}>
                <span className={styles.month}>{month}</span>
                <span className={styles.day}>{day}</span>
              </div>
              <div className={styles.info}>
                <div className={styles.itemTitle}>{dl.title}</div>
                <div className={styles.itemDesc}>{dl.description}</div>
              </div>
              <div className={styles.countdown}>{daysUntil}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
