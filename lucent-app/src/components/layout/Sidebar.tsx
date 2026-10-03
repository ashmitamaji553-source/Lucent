'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/materials', label: 'My Materials', icon: '▤' },
  { href: '/topics', label: 'Topic Map', icon: '⌘' },
  { href: '/plan', label: 'Study Plan', icon: '□' },
  { href: '/tutor', label: 'Tutor', icon: '◈' },
  { href: '/resources', label: 'Resources', icon: '▷' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>LUCENT</div>
        <div className={styles.tag}>Bring the hidden to light.</div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.ico} aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.divide} />
        <nav className={styles.nav}>
          <Link
            href="/settings"
            className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}
          >
            <span className={styles.ico} aria-hidden="true">⚙</span>
            <span>Settings</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
