'use client';
import { useState } from 'react';
import { mockFiles, getRelativeTime } from '@/lib/mockData';
import { UploadedFile } from '@/lib/types';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './page.module.css';

export default function MaterialsPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>(mockFiles);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (newFiles: FileList) => {
    const added: UploadedFile[] = Array.from(newFiles).map((f, i) => ({
      id: String(Date.now() + i),
      name: f.name,
      type: 'Other' as const,
      uploadedAt: new Date(),
      status: 'Processing' as const,
    }));
    setFiles(prev => [...added, ...prev]);
    showToast(`${newFiles.length} file(s) uploaded — analyzing...`);
    setTimeout(() => {
      setFiles(prev => prev.map(f => added.find(a => a.id === f.id) ? { ...f, status: 'Processed' } : f));
    }, 2000);
  };

  const typeColors: Record<string, string> = {
    Syllabus: '#A2725E',
    Notes: '#879B82',
    PYQs: '#C69A62',
    Notice: '#D98F9A',
    Other: '#9B7F87',
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
            onDragOver={(e) => { e.preventDefault(); }}
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
              type="file" multiple hidden
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </label>

          <div className={styles.quickBtns}>
            {['Syllabus', 'Notes', 'PYQs', 'Notice'].map(cat => (
              <button key={cat} className={styles.quickBtn} onClick={() => showToast(`Add ${cat} — select your file`)}>
                + {cat}
              </button>
            ))}
          </div>
        </div>

        {/* File list */}
        <div className={styles.fileList}>
          <div className={styles.listHeader}>
            <span>{files.length} file{files.length !== 1 ? 's' : ''} uploaded</span>
          </div>
          {files.map(file => (
            <div key={file.id} className={styles.fileRow}>
              <div className={styles.ficon}>PDF</div>
              <div className={styles.finfo}>
                <div className={styles.fname}>{file.name}</div>
                <div className={styles.fmeta}>{getRelativeTime(file.uploadedAt)}</div>
              </div>
              <span
                className={styles.typePill}
                style={{ background: typeColors[file.type] + '22', color: typeColors[file.type] }}
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
