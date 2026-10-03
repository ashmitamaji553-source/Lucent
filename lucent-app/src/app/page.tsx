'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Hero from '@/components/dashboard/Hero';
import SignalCards from '@/components/dashboard/SignalCards';
import MaterialUpload from '@/components/dashboard/MaterialUpload';
import RecentUploads from '@/components/dashboard/RecentUploads';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import TopicCoverage from '@/components/dashboard/TopicCoverage';
import QuickAccess from '@/components/dashboard/QuickAccess';
import styles from './page.module.css';

export default function DashboardPage() {
  const signalRef = useRef<HTMLDivElement>(null);
  const midGridRef = useRef<HTMLDivElement>(null);
  const bottomGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const sections = [
      signalRef.current,
      midGridRef.current,
      bottomGridRef.current,
    ].filter(Boolean) as HTMLElement[];

    const observers: IntersectionObserver[] = [];

    sections.forEach((sec) => {
      // Set initial restrained entrance state
      gsap.set(sec, { opacity: 0, y: 22, filter: 'blur(5px)' });

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            gsap.to(sec, {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 1.05,
              ease: 'power2.out',
              clearProps: 'filter',
            });
            observer.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      observer.observe(sec);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <div className={styles.page}>
      <Hero />
      <div className={styles.inner}>
        <div ref={signalRef}>
          <SignalCards />
        </div>

        <div ref={midGridRef} className={styles.grid}>
          <MaterialUpload />
          <RecentUploads />
        </div>

        <div ref={bottomGridRef} className={styles.bottomGrid}>
          <UpcomingDeadlines />
          <TopicCoverage />
          <QuickAccess />
        </div>
      </div>
    </div>
  );
}
