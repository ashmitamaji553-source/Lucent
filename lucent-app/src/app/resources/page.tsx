// src/app/resources/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Resource } from '@/lib/models/types';
import styles from './page.module.css';

const typeIcons: Record<string, string> = {
  Video: '▷',
  Article: '▤',
  PDF: '▥',
  Quiz: '◉',
};

export default function ResourcesPage() {
  const [subjectGroups, setSubjectGroups] = useState<Array<{ subject: string; resources: Resource[] }>>([]);

  useEffect(() => {
    apiClient.getResources().then((groups) => {
      if (groups && groups.length > 0) {
        setSubjectGroups(groups);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Resources</h1>
        <p className={styles.desc}>Handpicked references based on your topic coverage and PYQ patterns.</p>
      </div>

      {subjectGroups.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)', maxWidth: '560px', margin: '40px auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', marginBottom: '8px', color: 'var(--ink)' }}>No Resources Curated Yet</h2>
          <p style={{ color: 'var(--stone)', fontSize: '14px', lineHeight: 1.5 }}>
            Once your study topics and course materials are uploaded, tailored reference articles, visual guides, and practice links will appear here.
          </p>
        </div>
      ) : (
        subjectGroups.map(({ subject, resources }) => (
          <div key={subject} className={styles.subjectGroup}>
            <div className={styles.subjectLabel}>{subject}</div>
            <div className={styles.resourceGrid}>
              {resources.map((r) => (
                <a key={r.id} href={r.url} className={styles.resource} target="_blank" rel="noopener noreferrer">
                  <div className={styles.resourceHeader}>
                    <span className={styles.typeIcon}>{typeIcons[r.type] || '▤'}</span>
                    <span className={styles.type}>{r.type}</span>
                    {r.relevance === 'High' && (
                      <span className={styles.highBadge}>High relevance</span>
                    )}
                  </div>
                  <div className={styles.resourceTitle}>{r.title}</div>
                  <div className={styles.resourceFooter}>
                    <span className={styles.subject}>{r.subject}</span>
                    <span className={styles.arrow}>→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
