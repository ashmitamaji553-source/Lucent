'use client';
import { useState, useEffect, useRef } from 'react';
import { useLucent } from '@/lib/LucentContext';
import styles from './TopicCoverage.module.css';

function getCoverageStatus(coverage: number) {
  if (coverage >= 70) return { label: 'OPTIMAL', class: styles.sage };
  if (coverage >= 50) return { label: 'REVIEW', class: styles.honey };
  return { label: 'DEFICIT', class: styles.rose };
}

export default function TopicCoverage() {
  const { subjects } = useLucent();
  const panelRef = useRef<HTMLElement>(null);
  const [hasRevealed, setHasRevealed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    const el = panelRef.current;
    if (!el || hasRevealed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasRevealed]);

  return (
    <article ref={panelRef} className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.indexNum}>05</span>
          <span>CURRICULUM TOPOLOGY</span>
        </div>
        <h2 className={styles.title}>Subject Health</h2>
        <p className={styles.subtext}>Resolved coverage vs syllabus benchmarks.</p>
      </div>

      <div className={styles.list}>
        {subjects.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--stone)', fontSize: '13px', lineHeight: 1.5 }}>
            No subjects analyzed yet. Upload course materials to measure curriculum topology.
          </div>
        ) : (
          subjects.map((topic, idx) => {
            const status = getCoverageStatus(topic.coverage);
            return (
              <div key={topic.id} className={styles.subjectItem}>
                <div className={styles.subjectRow}>
                  <span className={styles.subjectName}>{topic.subject}</span>
                  <div className={styles.metricGroup}>
                    <span className={`${styles.statusBadge} ${status.class}`}>{status.label}</span>
                    <span className={styles.percentage}>{topic.coverage}%</span>
                  </div>
                </div>

                <div className={styles.track}>
                  <div
                    className={`${styles.fill} ${status.class}`}
                    style={{
                      width: hasRevealed ? `${topic.coverage}%` : '0%',
                      transitionDelay: `${idx * 80}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
