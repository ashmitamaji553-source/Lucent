'use client';
import { useState, useRef } from 'react';
import { mockFiles, getRelativeTime } from '@/lib/mockData';
import { UploadedFile } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './MaterialUpload.module.css';

const quickCategories = [
  { label: 'Add Syllabus', icon: '▤' },
  { label: 'Add Notes', icon: '▥' },
  { label: 'Add PYQs', icon: '◉' },
  { label: 'Add Notices', icon: '⌖' },
];

export default function MaterialUpload() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>(mockFiles);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList) => {
    const added: UploadedFile[] = Array.from(newFiles).map((f, i) => ({
      id: String(Date.now() + i),
      name: f.name,
      type: 'Other' as const,
      uploadedAt: new Date(),
      status: 'Processing' as const,
    }));
    setFiles(prev => [...added, ...prev]);
    showToast(`${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} uploaded — processing...`);
    // Simulate processing
    setTimeout(() => {
      setFiles(prev => prev.map(f => added.find(a => a.id === f.id) ? { ...f, status: 'Processed' } : f));
    }, 2000);
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
              onClick={() => { inputRef.current?.click(); showToast(`${cat.label} — select your file`); }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={styles.chevron}>›</span>
            </button>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div className={styles.files}>
          {files.slice(0, 6).map((file) => (
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
