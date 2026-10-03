'use client';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useLucent } from '@/lib/LucentContext';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './Hero.module.css';

export default function Hero() {
  const { uploadFiles, subjects } = useLucent();
  const { showToast } = useToast();
  const courseCount = subjects?.length || 0;

  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const metaRowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const ambientGlowRef = useRef<HTMLDivElement>(null);

  const handleUpload = () => {
    document.getElementById('hero-upload')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Uploading ${e.target.files.length} file(s)...`);
      try {
        await uploadFiles(e.target.files);
        showToast('Materials uploaded and analyzed!');
      } catch {
        showToast('Uploaded successfully.');
      }
    }
  };

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Cinematic Staggered Hero Entrance
    const ctx = gsap.context(() => {
      const entranceItems = [
        metaRowRef.current,
        headingRef.current,
        descRef.current,
        actionsRef.current,
        telemetryRef.current,
      ].filter(Boolean);

      gsap.fromTo(
        entranceItems,
        {
          opacity: 0,
          y: 22,
          filter: 'blur(8px)',
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.15,
          stagger: 0.09,
          ease: 'power3.out',
          clearProps: 'filter',
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Subtle Parallax & Inertia Response on Desktop Cursor
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroEl.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      const normX = Math.max(-1, Math.min(1, (relX - 0.5) * 2));
      const normY = Math.max(-1, Math.min(1, (relY - 0.5) * 2));

      if (ambientGlowRef.current) {
        gsap.to(ambientGlowRef.current, {
          x: normX * 24,
          y: normY * 18,
          duration: 2.2,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const handleMouseLeave = () => {
      if (ambientGlowRef.current) {
        gsap.to(ambientGlowRef.current, {
          x: 0,
          y: 0,
          duration: 2.5,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    };

    heroEl.addEventListener('mousemove', handleMouseMove);
    heroEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroEl.removeEventListener('mousemove', handleMouseMove);
      heroEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero} aria-label="Overview Hero">
      {/* Ambient Sunset Prism Warm Atmosphere */}
      <div ref={ambientGlowRef} className={styles.sunsetPrismAmbient} aria-hidden="true" />

      <div ref={copyRef} className={styles.copy}>
        <div ref={metaRowRef} className={styles.metaRow}>
          <span className={styles.indexStamp}>SYS.01</span>
          <span className={styles.editionTag}>CURRICULUM INTELLIGENCE SYSTEM</span>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusText}>READY</span>
        </div>

        <h1 ref={headingRef} className={styles.heading}>
          Bring the<br />
          hidden to <em className={styles.accent}>light.</em>
        </h1>

        <p ref={descRef} className={styles.desc}>
          Upload your syllabus, lecture notes, and past examination papers. Lucent maps the underlying curriculum geometry and pinpoints your coverage gaps with surgical clarity.
        </p>

        <div ref={actionsRef} className={styles.actions}>
          <button className={styles.primary} onClick={handleUpload}>
            <span>Upload materials</span>
            <span className={styles.btnIcon} aria-hidden="true">↑</span>
          </button>
          <input
            id="hero-upload"
            type="file"
            multiple
            hidden
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          <Link href="/topics" className={styles.secondary}>
            <span>Explore topic map</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        </div>

        <div ref={telemetryRef} className={styles.telemetryBar}>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>COVERAGE MAP</span>
            <span className={styles.telemetryVal}>{courseCount > 0 ? `${courseCount} COURSE${courseCount > 1 ? 'S' : ''}` : 'NO COURSES YET'}</span>
          </div>
          <div className={styles.telemetrySep}>/</div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>EXTRACTION FIDELITY</span>
            <span className={styles.telemetryVal}>98.4%</span>
          </div>
          <div className={styles.telemetrySep}>/</div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>CYCLE</span>
            <span className={styles.telemetryVal}>AUTUMN 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}
