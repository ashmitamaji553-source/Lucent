import Link from 'next/link';
import { mockSignals } from '@/lib/mockData';
import styles from './SignalCards.module.css';

export default function SignalCards() {
  const s = mockSignals;

  return (
    <section className={styles.strip} aria-label="Coverage signals">
      {/* Stat 1 */}
      <Link href="/topics" className={styles.stat}>
        <div className={styles.statValue}>{s.missingTopics}</div>
        <div className={styles.statLabel}>topics need attention</div>
        <div className={styles.statAction}>Review gaps →</div>
      </Link>

      <div className={styles.divider} />

      {/* Stat 2 */}
      <Link href="/materials" className={styles.stat}>
        <div className={styles.statValue}>{s.updatedNotices}</div>
        <div className={styles.statLabel}>updated notices</div>
        <div className={styles.statAction}>See changes →</div>
      </Link>

      <div className={styles.divider} />

      {/* Stat 3 */}
      <Link href="/plan" className={styles.stat}>
        <div className={styles.statValue}>{s.highPriorityTopics}</div>
        <div className={styles.statLabel}>high-priority topics</div>
        <div className={styles.statAction}>Open study plan →</div>
      </Link>

      <div className={styles.divider} />

      {/* Readiness — with inline bar */}
      <div className={styles.stat}>
        <div className={styles.readinessRow}>
          <div className={styles.statValue}>{s.overallReadiness}%</div>
          <div className={styles.readinessMark} style={{ '--pct': `${s.overallReadiness}%` } as React.CSSProperties} />
        </div>
        <div className={styles.statLabel}>overall readiness</div>
        <div className={styles.statSub}>across all subjects</div>
      </div>
    </section>
  );
}
