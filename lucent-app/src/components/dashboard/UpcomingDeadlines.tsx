// src/components/dashboard/UpcomingDeadlines.tsx
'use client';
import { getDaysUntil, getDateLabel } from '@/lib/mockData';
import { useLucent } from '@/lib/LucentContext';
import styles from './UpcomingDeadlines.module.css';

export default function UpcomingDeadlines() {
  const { deadlines } = useLucent();

  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Upcoming Deadlines</h2>

      {deadlines.slice(0, 3).map((dl) => {
        const { month, day } = getDateLabel(dl.dueDate);
        const daysUntil = getDaysUntil(dl.dueDate);
        return (
          <div key={dl.id} className={styles.deadline}>
            <div className={styles.date}>
              <span>{month}</span>
              <b>{day}</b>
            </div>
            <div className={styles.dinfo}>
              <div className={styles.dtitle}>{dl.title}</div>
              <div className={styles.dmeta}>{dl.description}</div>
            </div>
            <div className={styles.time}>{daysUntil}</div>
          </div>
        );
      })}
    </article>
  );
}
