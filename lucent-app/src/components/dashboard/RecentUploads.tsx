'use client';
import { getRelativeTime } from '@/lib/mockData';
import { useLucent } from '@/lib/LucentContext';
import styles from './RecentUploads.module.css';

export default function RecentUploads() {
  const { documents } = useLucent();

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.indexNum}>03</span>
          <span>ACTIVITY LOG</span>
        </div>
        <h2 className={styles.title}>Recent Dispatches</h2>
        <p className={styles.subtext}>Latest parsed inputs & syllabus revisions.</p>
      </div>

      <div className={styles.feed}>
        {documents.slice(0, 5).map((file, idx) => (
          <div key={file.id} className={styles.item}>
            <span className={styles.itemSeq}>0{idx + 1}</span>
            <div className={styles.itemContent}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemName}>{file.name}</span>
                <span className={styles.itemType}>{file.type}</span>
              </div>
              <div className={styles.itemMeta}>
                <span className={styles.itemTime}>{getRelativeTime(file.uploadedAt)}</span>
                <span className={styles.metaDot}>•</span>
                <span className={styles.itemStatus}>{file.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
