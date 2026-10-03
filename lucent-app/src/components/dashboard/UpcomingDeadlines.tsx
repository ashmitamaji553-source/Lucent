import { mockDeadlines, getDaysUntil, getDateLabel } from '@/lib/mockData';
import styles from './UpcomingDeadlines.module.css';

export default function UpcomingDeadlines() {
  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Upcoming Deadlines</h2>

      {mockDeadlines.map((dl) => {
        const { month, day } = getDateLabel(dl.date);
        const daysUntil = getDaysUntil(dl.date);
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
