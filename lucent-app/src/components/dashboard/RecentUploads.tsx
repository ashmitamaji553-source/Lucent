// src/components/dashboard/RecentUploads.tsx
'use client';
import { getRelativeTime } from '@/lib/mockData';
import { useLucent } from '@/lib/LucentContext';
import styles from './RecentUploads.module.css';

export default function RecentUploads() {
  const { documents } = useLucent();

  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Recent Uploads</h2>
      <p className={styles.subtext}>Your latest course material.</p>

      {documents.slice(0, 4).map((file) => (
        <div key={file.id} className={styles.file}>
          <div className={styles.ficon}>PDF</div>
          <div className={styles.finfo}>
            <div className={styles.fname}>{file.name}</div>
            <div className={styles.fmeta}>{file.type} · {getRelativeTime(file.uploadedAt)}</div>
          </div>
          <div className={styles.dot} title={file.status} />
        </div>
      ))}
    </article>
  );
}
