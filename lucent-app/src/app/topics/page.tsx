'use client';
import { useState } from 'react';
import { mockTopics } from '@/lib/mockData';
import { SubTopic } from '@/lib/types';
import styles from './page.module.css';

function SubTopicNode({ node, depth = 0 }: { node: SubTopic; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={styles.node} style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
      <button
        className={`${styles.nodeBtn} ${hasChildren ? styles.hasChildren : ''}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren && (
          <span className={`${styles.chevron} ${open ? styles.open : ''}`}>›</span>
        )}
        {!hasChildren && <span className={styles.leaf}>·</span>}
        <span className={styles.nodeName}>{node.name}</span>
        <span className={`${styles.badge} ${getCoverageStyle(node.coverage)}`}>
          {node.coverage}%
        </span>
      </button>
      {open && hasChildren && node.children!.map(child => (
        <SubTopicNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function getCoverageStyle(cov: number) {
  if (cov >= 70) return styles.good;
  if (cov >= 50) return styles.mid;
  return styles.weak;
}

export default function TopicsPage() {
  const [selected, setSelected] = useState(mockTopics[0]);
  const [selectedSub, setSelectedSub] = useState<SubTopic | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>ACADEMIC KNOWLEDGE MAP</div>
        <h1 className={styles.heading}>Topic Map</h1>
        <p className={styles.desc}>Navigate your curriculum. See what you know, and what needs attention.</p>
      </div>

      <div className={styles.layout}>
        {/* Subject list */}
        <aside className={styles.subjects}>
          <div className={styles.sectionLabel}>Subjects</div>
          {mockTopics.map((topic) => (
            <button
              key={topic.id}
              className={`${styles.subjectBtn} ${selected.id === topic.id ? styles.selectedSubject : ''}`}
              onClick={() => { setSelected(topic); setSelectedSub(null); }}
            >
              <span>{topic.subject}</span>
              <span className={`${styles.badge} ${getCoverageStyle(topic.coverage)}`}>{topic.coverage}%</span>
            </button>
          ))}
        </aside>

        {/* Topic tree */}
        <div className={styles.tree}>
          <div className={styles.treeHeader}>
            <div className={styles.treeName}>{selected.subject}</div>
            <div className={styles.treeCoverage}>
              <span>Coverage</span>
              <strong>{selected.coverage}%</strong>
            </div>
          </div>

          <div className={styles.treeBody}>
            {selected.subtopics?.map((sub) => (
              <div key={sub.id}>
                <button
                  className={`${styles.topicRow} ${selectedSub?.id === sub.id ? styles.selectedTopic : ''}`}
                  onClick={() => setSelectedSub(selectedSub?.id === sub.id ? null : sub)}
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

                {selectedSub?.id === sub.id && sub.children && sub.children.map(child => (
                  <div key={child.id} className={styles.childRow}>
                    <span className={styles.childName}>└ {child.name}</span>
                    <span className={`${styles.badge} ${styles.sm} ${getCoverageStyle(child.coverage)}`}>{child.coverage}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

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
                {selectedSub.children.map(c => (
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
