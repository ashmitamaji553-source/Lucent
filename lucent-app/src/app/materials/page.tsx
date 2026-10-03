// src/app/materials/page.tsx
'use client';
import { useState, useRef } from 'react';
import { getRelativeTime } from '@/lib/mockData';
import { useToast } from '@/components/ui/ToastProvider';
import { useLucent } from '@/lib/LucentContext';
import styles from './page.module.css';

export default function MaterialsPage() {
  const { showToast } = useToast();
  const { documents, uploadFiles } = useLucent();
  const [isDragging, setIsDragging] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Other');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (newFiles: FileList) => {
    if (!newFiles || newFiles.length === 0) return;
    showToast(`${newFiles.length} file(s) uploaded — analyzing...`);
    try {
      const res = await uploadFiles(newFiles, activeCategory);
      if (res && res.feedback && res.feedback.length > 0) {
        showToast(res.feedback.join(' '));
      } else {
        showToast('Files analyzed and added to curriculum!');
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed. Please check the file and try again.');
    } finally {
      setActiveCategory('Other');
    }
  };

  const triggerCategoryUpload = (cat: string) => {
    setActiveCategory(cat);
    inputRef.current?.click();
    showToast(`Add ${cat} — select your file`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>My Materials</h1>
        <p className={styles.desc}>All your uploaded study materials. Lucent analyses each one to build your topic map.</p>
      </div>

      <div className={styles.layout}>
        {/* Upload zone */}
        <div className={styles.uploadZone}>
          <div className={styles.uploadLabel}>Upload new</div>
          <label
            className={`${styles.drop} ${isDragging ? styles.drag : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            }}
          >
            <div className={styles.dropIcon}>⇧</div>
            <strong>Drag files here</strong>
            <span>or click to browse</span>
            <span className={styles.formats}>PDF · DOCX · TXT · Images</span>
            <input
              ref={inputRef}
              type="file" multiple hidden
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </label>

          <div className={styles.quickBtns}>
            {['Syllabus', 'Notes', 'PYQs', 'Notice'].map(cat => (
              <button key={cat} className={styles.quickBtn} onClick={() => triggerCategoryUpload(cat)}>
                + {cat}
              </button>
            ))}
          </div>
        </div>

        {/* File table */}
        <div className={styles.fileList}>
          <div className={styles.listHeader}>
            <span>File</span>
            <span>Type</span>
            <span>Status</span>
            <span>Uploaded</span>
          </div>
          {documents.map(file => (
            <div key={file.id} className={styles.fileRow}>
              <div className={styles.fileMain}>
                <div className={styles.ficon}>PDF</div>
                <div className={styles.finfo}>
                  <div className={styles.fname}>{file.name}</div>
                </div>
              </div>
              <span className={styles.typePill}>{file.type}</span>
              <div className={`${styles.status} ${file.status === 'Processing' ? styles.processing : ''}`}>
                <div className={`${styles.statusDot} ${file.status === 'Processed' ? styles.processed : styles.proc}`} />
                {file.status}
              </div>
              <span className={styles.fileAge}>{getRelativeTime(file.uploadedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
