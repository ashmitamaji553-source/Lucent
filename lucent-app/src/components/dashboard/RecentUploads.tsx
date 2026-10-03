import { mockFiles, getRelativeTime } from '@/lib/mockData';
import styles from './RecentUploads.module.css';

export default function RecentUploads() {
  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Recent Uploads</h2>
      <p className={styles.subtext}>Your latest course material.</p>

      {mockFiles.map((file) => (
        <div key={file.id} className={styles.file}>
          <div className={styles.ficon}>PDF</div>
          <div className={styles.finfo}>
            <div className={styles.fname}>{file.name}</div>
            <div className={styles.fmeta}>{file.type} · {getRelativeTime(file.uploadedAt)}</div>
          </div>
          <div className={styles.dot} title="Processed" />
        </div>
      ))}
    </article>
  );
}
