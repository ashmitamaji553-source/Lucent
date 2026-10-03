import Link from 'next/link';
import styles from './QuickAccess.module.css';

const quickLinks = [
  { href: '/topics', label: 'Open Topic Map' },
  { href: '/tutor', label: 'Chat with Lucent' },
  { href: '/plan', label: 'View Study Plan' },
  { href: '/resources', label: 'Explore Resources' },
];

export default function QuickAccess() {
  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Quick Access</h2>
      <div className={styles.grid}>
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className={styles.quickBtn}>
            <span>{link.label}</span>
            <b>→</b>
          </Link>
        ))}
      </div>
    </article>
  );
}
