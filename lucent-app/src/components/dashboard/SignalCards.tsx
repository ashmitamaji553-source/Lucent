'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useLucent } from '@/lib/LucentContext';
import styles from './SignalCards.module.css';

export default function SignalCards() {
  const { signals: s } = useLucent();
  const containerRef = useRef<HTMLElement>(null);
  const hasAnimatedRef = useRef(false);

  // Animated counters and gauge
  const [displayMissing, setDisplayMissing] = useState(0);
  const [displayNotices, setDisplayNotices] = useState(0);
  const [displayPriority, setDisplayPriority] = useState(0);
  const [displayReadiness, setDisplayReadiness] = useState(0);
  const [gaugeWidth, setGaugeWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayMissing(s.missingTopics);
      setDisplayNotices(s.updatedNotices);
      setDisplayPriority(s.highPriorityTopics);
      setDisplayReadiness(s.overallReadiness);
      setGaugeWidth(s.overallReadiness);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const isInitial = !hasAnimatedRef.current;
          hasAnimatedRef.current = true;

          const counterObj = {
            missing: displayMissing,
            notices: displayNotices,
            priority: displayPriority,
            readiness: displayReadiness,
            gauge: gaugeWidth,
          };

          gsap.to(counterObj, {
            missing: s.missingTopics,
            notices: s.updatedNotices,
            priority: s.highPriorityTopics,
            readiness: s.overallReadiness,
            gauge: s.overallReadiness,
            duration: isInitial ? 1.35 : 0.6,
            ease: 'power2.out',
            onUpdate: () => {
              setDisplayMissing(Math.round(counterObj.missing));
              setDisplayNotices(Math.round(counterObj.notices));
              setDisplayPriority(Math.round(counterObj.priority));
              setDisplayReadiness(Math.round(counterObj.readiness));
              setGaugeWidth(counterObj.gauge);
            },
          });
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [s.missingTopics, s.updatedNotices, s.highPriorityTopics, s.overallReadiness]);

  return (
    <section ref={containerRef} className={styles.telemetryStrip} aria-label="Curriculum Telemetry">
      {/* Metric 01: Attention Required */}
      <Link href="/topics" className={styles.statBlock}>
        <div className={styles.blockHead}>
          <span className={styles.blockIndex}>01</span>
          <span className={styles.blockTag}>KNOWLEDGE GAPS</span>
        </div>
        <div className={styles.statRow}>
          <div className={styles.statValue}>{displayMissing}</div>
          <span className={styles.alertPill}>ATTN</span>
        </div>
        <div className={styles.statLabel}>topics require immediate review</div>
        <div className={styles.statLink}>
          <span>Inspect blindspots</span>
          <span className={styles.linkArrow} aria-hidden="true">→</span>
        </div>
      </Link>

      <div className={styles.verticalRule} />

      {/* Metric 02: Updated Notices */}
      <Link href="/materials" className={styles.statBlock}>
        <div className={styles.blockHead}>
          <span className={styles.blockIndex}>02</span>
          <span className={styles.blockTag}>SYNC ACTIVITY</span>
        </div>
        <div className={styles.statRow}>
          <div className={styles.statValue}>{displayNotices}</div>
          <span className={styles.syncDot} aria-hidden="true" />
        </div>
        <div className={styles.statLabel}>new notices parsed & indexed</div>
        <div className={styles.statLink}>
          <span>Review change logs</span>
          <span className={styles.linkArrow} aria-hidden="true">→</span>
        </div>
      </Link>

      <div className={styles.verticalRule} />

      {/* Metric 03: High Priority Topics */}
      <Link href="/plan" className={styles.statBlock}>
        <div className={styles.blockHead}>
          <span className={styles.blockIndex}>03</span>
          <span className={styles.blockTag}>EXAM FOCUS</span>
        </div>
        <div className={styles.statRow}>
          <div className={styles.statValue}>{displayPriority}</div>
          <span className={styles.priorityPill}>PYQ HIGH</span>
        </div>
        <div className={styles.statLabel}>frequently tested concepts</div>
        <div className={styles.statLink}>
          <span>Open study plan</span>
          <span className={styles.linkArrow} aria-hidden="true">→</span>
        </div>
      </Link>

      <div className={styles.verticalRule} />

      {/* Metric 04: Overall Readiness */}
      <div className={styles.statBlock}>
        <div className={styles.blockHead}>
          <span className={styles.blockIndex}>04</span>
          <span className={styles.blockTag}>PREPAREDNESS</span>
        </div>
        <div className={styles.readinessHead}>
          <div className={styles.statValue}>{displayReadiness}%</div>
          <span className={styles.readinessStatus}>TARGET: 85%</span>
        </div>
        {/* Precision engineered track with calibrated ticks and animated gauge fill */}
        <div className={styles.gaugeContainer}>
          <div className={styles.gaugeTrack}>
            <div
              className={styles.gaugeFill}
              style={{ width: `${gaugeWidth}%` }}
            />
          </div>
          <div className={styles.gaugeTicks}>
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
        <div className={styles.statLabel}>composite index across 5 subjects</div>
      </div>
    </section>
  );
}
