'use client';
import { useState, useRef } from 'react';
import { getRelativeTime } from '@/lib/mockData';
import { useToast } from '@/components/ui/ToastProvider';
import { useLucent } from '@/lib/LucentContext';
import styles from './MaterialUpload.module.css';

const quickCategories = [
  { label: 'Add Syllabus', category: 'Syllabus', icon: '▤' },
  { label: 'Add Notes', category: 'Notes', icon: '▥' },
  { label: 'Add PYQs', category: 'PYQs', icon: '◉' },
  { label: 'Add Notices', category: 'Notice', icon: '⌖' },
];

export default function MaterialUpload() {
  const { showToast } = useToast();
  const { documents, uploadFiles } = useLucent();
  const [isDragging, setIsDragging] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('Other');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (newFiles: FileList) => {
    if (!newFiles || newFiles.length === 0) return;
    showToast(`${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} uploaded — processing...`);
    try {
      await uploadFiles(newFiles, currentCategory);
      showToast('Document analyzed and added to knowledge tree!');
    } catch {
      showToast('Uploaded and processed locally.');
    } finally {
      setCurrentCategory('Other');
    }
  };

  return (
    <article className={styles.panel}>
      <h2 className={styles.title}>Upload Your Materials</h2>
      <p className={styles.subtext}>Syllabus, notes, PYQs, notices — we'll make sense of it all.</p>

      <div className={styles.material}>
        <label
          className={`${styles.drop} ${isDragging ? styles.drag : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
        >
          <div className={styles.dropIcon}>⇧</div>
          <strong>Drag & drop your files here</strong>
          <span>or click to browse</span>
          <span className={styles.formats}>PDF • DOCX • Images • TXT</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          />
        </label>

        <div className={styles.quickupload}>
          {quickCategories.map((cat) => (
            <button
              key={cat.label}
              className={styles.quickBtn}
              onClick={() => {
                setCurrentCategory(cat.category);
                inputRef.current?.click();
                showToast(`${cat.label} — select your file`);
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={styles.chevron}>›</span>
            </button>
          ))}
        </div>
      </div>

      {documents.length > 0 && (
        <div className={styles.files}>
          {documents.slice(0, 6).map((file) => (
            <div key={file.id} className={styles.file}>
              <div className={styles.ficon}>PDF</div>
              <div className={styles.finfo}>
                <div className={styles.fname}>{file.name}</div>
                <div className={styles.fmeta}>{file.type} · {getRelativeTime(file.uploadedAt)}</div>
              </div>
              <div className={`${styles.status} ${file.status === 'Processing' ? styles.processing : ''}`}>
                {file.status === 'Processed' && <i className={styles.dot} />}
                {file.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
