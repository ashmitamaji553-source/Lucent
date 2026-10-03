import { mockResources } from '@/lib/mockData';
import styles from './page.module.css';

const typeIcons: Record<string, string> = {
  Video: '▷',
  Article: '▤',
  PDF: '▥',
  Quiz: '◉',
};

export default function ResourcesPage() {
  const subjects = [...new Set(mockResources.map(r => r.subject))];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>CURATED FOR YOUR GAPS</div>
        <h1 className={styles.heading}>Resources</h1>
        <p className={styles.desc}>Handpicked references based on your topic coverage and PYQ patterns.</p>
      </div>

      {subjects.map(subject => {
        const subResources = mockResources.filter(r => r.subject === subject);
        return (
          <div key={subject} className={styles.subjectGroup}>
            <div className={styles.subjectLabel}>{subject}</div>
            <div className={styles.resourceGrid}>
              {subResources.map(r => (
                <a key={r.id} href={r.url} className={styles.resource}>
                  <div className={styles.resourceHeader}>
                    <span className={styles.typeIcon}>{typeIcons[r.type]}</span>
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
        );
      })}
    </div>
  );
}
