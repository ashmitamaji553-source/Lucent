'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  index: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Overview', index: '01', icon: '⌂' },
  { href: '/materials', label: 'My Materials', index: '02', icon: '▤' },
  { href: '/topics', label: 'Topic Map', index: '03', icon: '⌘' },
  { href: '/plan', label: 'Study Plan', index: '04', icon: '□' },
  { href: '/tutor', label: 'AI Tutor', index: '05', icon: '◈' },
  { href: '/resources', label: 'Resources', index: '06', icon: '▷' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brand}>
        <div className={styles.logoRow}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.logoMark} aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" strokeWidth="1.5" fill="rgba(222, 142, 155, 0.18)" />
            <line x1="12" y1="2" x2="12" y2="4.8" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="12" y1="19.2" x2="12" y2="22" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="2" y1="12" x2="4.8" y2="12" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="19.2" y1="12" x2="22" y2="12" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="5.1" y1="5.1" x2="7.1" y2="7.1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="16.9" y1="16.9" x2="18.9" y2="18.9" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="18.9" y1="5.1" x2="16.9" y2="7.1" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="7.1" y1="16.9" x2="5.1" y2="18.9" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className={styles.logo}>LUCENT</span>
          <span className={styles.editionPill}>v2.4</span>
        </div>
        <p className={styles.tag}>Bring the hidden to light.</p>
      </div>

      {/* Navigation Section */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>WORKSPACE</span>
      </div>

      <nav className={styles.nav} aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.itemIndex}>{item.index}</span>
              <span className={styles.itemIcon} aria-hidden="true">{item.icon}</span>
              <span className={styles.itemLabel}>{item.label}</span>
              {isActive && <span className={styles.activePill} aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Telemetry Context */}
      <div className={styles.footer}>
        <div className={styles.termWidget}>
          <div className={styles.termRow}>
            <span className={styles.termLabel}>AUTUMN TERM 2026</span>
            <span className={styles.termStatus}>SYNCED</span>
          </div>
          <div className={styles.termProgress}>
            <div className={styles.termProgressBar} style={{ width: '68%' }} />
          </div>
          <div className={styles.termMeta}>
            <span>68% CURRICULUM COVERED</span>
          </div>
        </div>

        <div className={styles.footerNav}>
          <Link
            href="/settings"
            className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}
          >
            <span className={styles.itemIndex}>07</span>
            <span className={styles.itemIcon} aria-hidden="true">⚙</span>
            <span className={styles.itemLabel}>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
