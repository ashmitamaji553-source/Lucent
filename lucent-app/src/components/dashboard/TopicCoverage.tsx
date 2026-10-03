// src/components/dashboard/TopicCoverage.tsx
'use client';
import { useLucent } from '@/lib/LucentContext';
import styles from './TopicCoverage.module.css';

function getCoverageClass(coverage: number): string {
  if (coverage >= 70) return styles.sage;
  if (coverage >= 50) return styles.honey;
  return styles.rose;
}

export default function TopicCoverage() {
  const { subjects } = useLucent();

  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Topic Coverage Snapshot</h2>

      {subjects.slice(0, 5).map((subj) => (
        <div key={subj.id} className={styles.coverage}>
          <div className={styles.chead}>
            <span>{subj.subject}</span>
            <span className={styles.pct}>{subj.coverage}%</span>
          </div>
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${getCoverageClass(subj.coverage)}`}
              style={{ width: `${subj.coverage}%` }}
            />
          </div>
        </div>
      ))}
    </article>
  );
}
