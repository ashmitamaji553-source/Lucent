'use client';
import { useState, useRef } from 'react';
import { getRelativeTime } from '@/lib/mockData';
import { useToast } from '@/components/ui/ToastProvider';
import { useLucent } from '@/lib/LucentContext';
import styles from './MaterialUpload.module.css';

const quickCategories = [
  { label: 'Add Syllabus', category: 'Syllabus', icon: '▤', code: 'SYL' },
  { label: 'Add Notes', category: 'Notes', icon: '▥', code: 'NOT' },
  { label: 'Add PYQs', category: 'PYQs', icon: '◉', code: 'PYQ' },
  { label: 'Add Notices', category: 'Notice', icon: '⌖', code: 'NTC' },
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
      const res = await uploadFiles(newFiles, currentCategory);
      if (res && res.feedback && res.feedback.length > 0) {
        showToast(res.feedback.join(' '));
      } else {
        showToast('Document analyzed and added to curriculum!');
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed. Please check the file and try again.');
    } finally {
      setCurrentCategory('Other');
    }
  };

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.eyebrow}>
          <span className={styles.indexNum}>02</span>
          <span>CURRICULUM INTAKE</span>
        </div>
        <h2 className={styles.title}>Upload Course Materials</h2>
        <p className={styles.subtext}>
          Syllabus structures, lecture notes, past exam questions, and official university notices.
        </p>
      </div>

      <div className={styles.uploadArea}>
        <label
          className={`${styles.dropZone} ${isDragging ? styles.dragActive : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          }}
        >
          <div className={styles.dropAperture}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className={styles.dropText}>
            <strong>Drop course documents to parse</strong>
            <span>or choose file from device</span>
          </div>
          <div className={styles.formatPills}>
            <span>PDF</span>
            <span>DOCX</span>
            <span>TXT</span>
            <span>IMG</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
          />
        </label>

        <div className={styles.quickUploadList}>
          <span className={styles.quickLabel}>QUICK DISPATCH</span>
          {quickCategories.map((cat) => (
            <button
              key={cat.label}
              className={styles.quickItem}
              onClick={() => {
                setCurrentCategory(cat.category);
                inputRef.current?.click();
                showToast(`${cat.label} — select file`);
              }}
            >
              <span className={styles.catCode}>{cat.code}</span>
              <span className={styles.catName}>{cat.label}</span>
              <span className={styles.catChevron}>→</span>
            </button>
          ))}
        </div>
      </div>

      {documents.length > 0 && (
        <div className={styles.fileSection}>
          <div className={styles.fileListHeader}>
            <span>DOCUMENT</span>
            <span>CLASSIFICATION</span>
            <span>TIMESTAMP</span>
            <span>STATUS</span>
          </div>
          <div className={styles.fileRows}>
            {documents.slice(0, 5).map((file) => (
              <div key={file.id} className={styles.fileRow}>
                <div className={styles.fileNameCell}>
                  <span className={styles.fileBadge}>PDF</span>
                  <span className={styles.fileName}>{file.name}</span>
                </div>
                <div className={styles.fileTypeCell}>{file.type}</div>
                <div className={styles.fileTimeCell}>{getRelativeTime(file.uploadedAt)}</div>
                <div className={styles.fileStatusCell}>
                  <span className={`${styles.statusDot} ${file.status === 'Processing' ? styles.statusProcessing : styles.statusDone}`} />
                  <span className={styles.statusLabel}>{file.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
