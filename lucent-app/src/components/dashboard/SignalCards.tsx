'use client';
import Link from 'next/link';
import { useLucent } from '@/lib/LucentContext';
import styles from './SignalCards.module.css';

export default function SignalCards() {
  const { signals: s } = useLucent();

  return (
    <section className={styles.insights} aria-label="Quick signals">
      <article className={`${styles.insight} ${styles.pink}`}>
        <div className={styles.label}>▱ &nbsp; WHAT AM I MISSING?</div>
        <div className={styles.value}>{s.missingTopics} topics</div>
        <div className={styles.sub}>need attention</div>
        <Link href="/topics" className={styles.arrow} aria-label="View missing topics">→</Link>
      </article>

      <article className={styles.insight}>
        <div className={styles.label}>♧ &nbsp; WHAT CHANGED?</div>
        <div className={styles.value}>{s.updatedNotices} updated</div>
        <div className={styles.sub}>notices/deadlines</div>
        <Link href="/materials" className={styles.arrow} aria-label="View updates">→</Link>
      </article>

      <article className={`${styles.insight} ${styles.dark}`}>
        <div className={styles.label}>✦ &nbsp; WHAT MATTERS?</div>
        <div className={styles.value}>{s.highPriorityTopics} high-priority</div>
        <div className={styles.sub}>topics to focus on</div>
        <Link href="/plan" className={styles.arrow} aria-label="View priorities">→</Link>
      </article>

      <article className={styles.insight}>
        <div className={styles.label}>▥ &nbsp; OVERALL READINESS</div>
        <div className={styles.value}>{s.overallReadiness}%</div>
        <div className={styles.sub}>course coverage</div>
        <div className={styles.track} style={{ marginTop: 9 }}>
          <div
            className={`${styles.fill} ${styles.rose}`}
            style={{ width: `${s.overallReadiness}%` }}
          />
        </div>
      </article>
    </section>
  );
}
