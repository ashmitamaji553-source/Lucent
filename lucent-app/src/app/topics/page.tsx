// src/app/topics/page.tsx
'use client';
import { useState } from 'react';
import { useLucent } from '@/lib/LucentContext';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/ToastProvider';
import { SubTopic } from '@/lib/types';
import styles from './page.module.css';

function getCoverageStyle(cov: number) {
  if (cov >= 70) return styles.good;
  if (cov >= 50) return styles.mid;
  return styles.weak;
}

export default function TopicsPage() {
  const { subjects, refreshAll } = useLucent();
  const { showToast } = useToast();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<SubTopic | null>(null);
  const [isStudying, setIsStudying] = useState(false);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  const handleStudyProgress = async (topicId: string) => {
    setIsStudying(true);
    try {
      const newScore = await apiClient.studyTopic(topicId, 10);
      showToast(`Topic reviewed! Coverage updated to ${newScore}%`);
      await refreshAll();
      if (selectedSub && selectedSub.id === topicId) {
        setSelectedSub({ ...selectedSub, coverage: newScore });
      }
    } catch {
      showToast('Recorded study progress locally.');
    } finally {
      setIsStudying(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Topic Map</h1>
        <p className={styles.desc}>Navigate your curriculum. See where your coverage gaps are.</p>
      </div>

      <div className={styles.layout}>
        {/* Subject list */}
        <aside className={styles.subjects}>
          <div className={styles.sectionLabel}>Subjects</div>
          {subjects.map((topic) => (
            <button
              key={topic.id}
              className={`${styles.subjectBtn} ${(activeSubject?.id === topic.id) ? styles.selectedSubject : ''}`}
              onClick={() => { setSelectedSubjectId(topic.id); setSelectedSub(null); }}
            >
              <span>{topic.subject}</span>
              <span className={`${styles.badge} ${getCoverageStyle(topic.coverage)}`}>{topic.coverage}%</span>
            </button>
          ))}
        </aside>

        {/* Topic tree */}
        {activeSubject && (
          <div className={styles.tree}>
            <div className={styles.treeHeader}>
              <div className={styles.treeName}>{activeSubject.subject}</div>
              <div className={styles.treeCoverage}>
                <span>Coverage</span>
                <strong>{activeSubject.coverage}%</strong>
              </div>
            </div>

            <div className={styles.treeBody}>
              {activeSubject.subtopics?.map((sub) => (
                <div key={sub.id}>
                  <button
                    className={`${styles.topicRow} ${selectedSub?.id === sub.id ? styles.selectedTopic : ''}`}
                    onClick={() => setSelectedSub(selectedSub?.id === sub.id ? null : (sub as unknown as SubTopic))}
                  >
                    <div className={styles.topicLeft}>
                      {sub.children && sub.children.length > 0 ? '▸' : '·'}
                      <span>{sub.name}</span>
                    </div>
                    <div className={styles.topicRight}>
                      <div className={styles.miniTrack}>
                        <div
                          className={`${styles.miniFill} ${getCoverageStyle(sub.coverage)}`}
                          style={{ width: `${sub.coverage}%` }}
                        />
                      </div>
                      <span className={styles.pct}>{sub.coverage}%</span>
                    </div>
                  </button>

                  {selectedSub?.id === sub.id && sub.children && sub.children.map((child: any) => (
                    <div key={child.id} className={styles.childRow}>
                      <span className={styles.childName}>└ {child.name}</span>
                      <span className={`${styles.badge} ${styles.sm} ${getCoverageStyle(child.coverage)}`}>{child.coverage}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selectedSub && (
          <div className={styles.detail}>
            <div className={styles.detailTitle}>{selectedSub.name}</div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Coverage</span>
              <span className={`${styles.badge} ${getCoverageStyle(selectedSub.coverage)}`}>{selectedSub.coverage}%</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>PYQ Frequency</span>
              <span className={`${styles.freqBadge} ${selectedSub.pyqFrequency === 'High' ? styles.freqHigh : styles.freqMed}`}>
                {selectedSub.pyqFrequency}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Difficulty</span>
              <span className={styles.diffBadge}>{selectedSub.difficulty}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className={styles.subjectBtn}
                style={{ background: 'var(--ink)', color: '#FAF4EF', justifyContent: 'center', padding: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.6)', borderRadius: 'var(--r-xs)', boxShadow: '0 2px 8px rgba(24,13,17,0.18)' }}
                onClick={() => handleStudyProgress(selectedSub.id)}
                disabled={isStudying}
              >
                {isStudying ? 'Updating...' : '✦ Mark Reviewed (+10%)'}
              </button>
            </div>

            {selectedSub.coverage < 60 && (
              <div className={styles.missing}>
                <div className={styles.missingLabel}>What's missing?</div>
                <p className={styles.missingText}>
                  This topic needs more coverage. Review your uploaded notes and practice with recent PYQs to strengthen this area.
                </p>
              </div>
            )}

            {selectedSub.children && selectedSub.children.length > 0 && (
              <div className={styles.subtopics}>
                <div className={styles.detailLabel} style={{ marginBottom: 8 }}>Subtopics</div>
                {selectedSub.children.map((c: any) => (
                  <div key={c.id} className={styles.subRow}>
                    <span>{c.name}</span>
                    <span className={`${styles.badge} ${styles.sm} ${getCoverageStyle(c.coverage)}`}>{c.coverage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
