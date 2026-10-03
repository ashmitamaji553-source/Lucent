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

  const typeColors: Record<string, string> = {
    Syllabus: '#A2725E',
    Notes: '#879B82',
    PYQs: '#C69A62',
    Notice: '#D98F9A',
    Other: '#9B7F87',
  };

  const triggerCategoryUpload = (cat: string) => {
    setActiveCategory(cat);
    inputRef.current?.click();
    showToast(`Add ${cat} — select your file`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>YOUR LEARNING LIBRARY</div>
        <h1 className={styles.heading}>My Materials</h1>
        <p className={styles.desc}>All your uploaded study materials. Lucent analyses each one to build your topic map.</p>
      </div>

      <div className={styles.layout}>
        {/* Upload zone */}
        <div className={styles.uploadZone}>
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
            <strong>Drag & drop files here</strong>
            <span>or click to browse</span>
            <span className={styles.formats}>PDF • DOCX • Images • TXT</span>
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

        {/* File list */}
        <div className={styles.fileList}>
          <div className={styles.listHeader}>
            <span>{documents.length} file{documents.length !== 1 ? 's' : ''} uploaded</span>
          </div>
          {documents.map(file => (
            <div key={file.id} className={styles.fileRow}>
              <div className={styles.ficon}>PDF</div>
              <div className={styles.finfo}>
                <div className={styles.fname}>{file.name}</div>
                <div className={styles.fmeta}>{getRelativeTime(file.uploadedAt)}</div>
              </div>
              <span
                className={styles.typePill}
                style={{ background: (typeColors[file.type] || '#A2725E') + '22', color: typeColors[file.type] || '#A2725E' }}
              >
                {file.type}
              </span>
              <div className={`${styles.status} ${file.status === 'Processing' ? styles.processing : ''}`}>
                <div className={`${styles.statusDot} ${file.status === 'Processed' ? styles.processed : file.status === 'Processing' ? styles.proc : ''}`} />
                {file.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
