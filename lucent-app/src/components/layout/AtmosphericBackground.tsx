'use client';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import styles from './AtmosphericBackground.module.css';

export default function AtmosphericBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLDivElement>(null);
  const prismRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // 1. Slow, organic ambient floating & breathing (resembles sunlight slowly moving across a study desk)
    const ctx = gsap.context(() => {
      if (bgImageRef.current) {
        // Very slow 1-2% scale movement
        gsap.to(bgImageRef.current, {
          scale: 1.025,
          y: -6,
          x: 4,
          duration: 11.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      if (prismRef.current) {
        gsap.to(prismRef.current, {
          x: 14,
          y: -10,
          duration: 13.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }, containerRef);

    // 2. Gentle desktop cursor parallax
    const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    if (!isTouch) {
      const handleMouseMove = (e: MouseEvent) => {
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        const normY = (e.clientY / window.innerHeight - 0.5) * 2;

        if (bgImageRef.current) {
          gsap.to(bgImageRef.current, {
            x: normX * 8,
            y: normY * 6,
            duration: 2.2,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }

        if (prismRef.current) {
          gsap.to(prismRef.current, {
            x: normX * 16,
            y: normY * 12,
            duration: 2.5,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }
      };

      const handleMouseLeave = () => {
        if (bgImageRef.current) {
          gsap.to(bgImageRef.current, {
            x: 0,
            y: 0,
            duration: 2.8,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        }
        if (prismRef.current) {
          gsap.to(prismRef.current, {
            x: 0,
            y: 0,
            duration: 3.0,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        }
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        ctx.revert();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      };
    }

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={styles.atmosphereCanvas} aria-hidden="true">
      {/* Translucent study image layer with soft radial mask */}
      <div ref={bgImageRef} className={styles.bgImageLayer} />

      {/* Warm soft cream/pink translucent ambient wash */}
      <div className={styles.overlayWash} />

      {/* Subtle optical prism / natural refraction highlight */}
      <div ref={prismRef} className={styles.prismHighlightLayer} />
    </div>
  );
}
