import { mockTopics } from '@/lib/mockData';
import styles from './TopicCoverage.module.css';

function getCoverageClass(coverage: number): string {
  if (coverage >= 70) return styles.sage;
  if (coverage >= 50) return styles.honey;
  return styles.rose;
}

export default function TopicCoverage() {
  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Topic Coverage Snapshot</h2>

      {mockTopics.map((topic) => (
        <div key={topic.id} className={styles.coverage}>
          <div className={styles.chead}>
            <span>{topic.subject}</span>
            <span className={styles.pct}>{topic.coverage}%</span>
          </div>
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${getCoverageClass(topic.coverage)}`}
              style={{ width: `${topic.coverage}%` }}
            />
          </div>
        </div>
      ))}
    </article>
  );
}
