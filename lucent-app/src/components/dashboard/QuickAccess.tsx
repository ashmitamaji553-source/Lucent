import Link from 'next/link';
import styles from './QuickAccess.module.css';

const quickLinks = [
  { href: '/topics', label: 'Curriculum Topology Map', index: '01' },
  { href: '/tutor', label: 'Query AI Academic Tutor', index: '02' },
  { href: '/plan', label: 'Optimized Study Sequence', index: '03' },
  { href: '/resources', label: 'Curated Paper & Text Index', index: '04' },
];

export default function QuickAccess() {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.indexNum}>06</span>
          <span>QUICK ROUTING</span>
        </div>
        <h2 className={styles.title}>Direct Index</h2>
        <p className={styles.subtext}>Immediate jump to active sub-systems.</p>
      </div>

      <div className={styles.linkList}>
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.linkItem}>
            <span className={styles.linkIndex}>{link.index}</span>
            <span className={styles.linkLabel}>{link.label}</span>
            <span className={styles.arrowIcon}>→</span>
          </Link>
        ))}
      </div>
    </article>
  );
}
