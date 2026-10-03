'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import styles from './Topbar.module.css';

export default function Topbar() {
  const [userName, setUserName] = useState('Ashmita Maji');
  const [avatar, setAvatar] = useState('AM');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ type: string; title: string; subtitle: string; url: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.getSettings().then((u) => {
      if (u) {
        if (u.name) setUserName(u.name);
        if (u.avatar) setAvatar(u.avatar);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await apiClient.search(query);
        setResults(found);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.leftContext}>
        <span className={styles.contextNode}>LUCENT</span>
        <span className={styles.contextSep}>/</span>
        <span className={styles.contextCurrent}>OVERVIEW</span>
      </div>

      <div className={styles.searchWrapper} ref={containerRef}>
        <label className={styles.search} htmlFor="search-input">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="search-input"
            type="text"
            placeholder="Search curriculum, lecture nodes, PYQs..."
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setShowDropdown(true)}
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </label>

        {showDropdown && results.length > 0 && (
          <div className={styles.resultsDropdown}>
            {results.map((r, i) => (
              <Link
                key={i}
                href={r.url}
                className={styles.resultItem}
                onClick={() => { setShowDropdown(false); setQuery(''); }}
              >
                <div className={styles.resultTitle}>{r.title}</div>
                <div className={styles.resultMeta}>{r.subtitle}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.rightSection}>
        <div className={styles.systemStatus}>
          <span className={styles.statusPing} aria-hidden="true" />
          <span className={styles.statusLabel}>ENGINE: OPTIMAL</span>
        </div>

        <button className={styles.iconBtn} aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className={styles.unreadDot} />
        </button>

        <div className={styles.profileDivider} />

        <Link href="/settings" className={styles.profile}>
          <div className={styles.avatar} aria-label="User avatar">{avatar}</div>
          <div className={styles.profileMeta}>
            <span className={styles.name}>{userName}</span>
            <span className={styles.role}>SCHOLAR</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </Link>
      </div>
    </header>
  );
}
