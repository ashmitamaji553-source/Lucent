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
            onDragOver={(e) => { e.preventDefault(); }}
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
              type="file" multiple hidden
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </label>

          <div className={styles.quickBtns}>
            {['+ Syllabus', '+ Notes', '+ PYQs', '+ Notice'].map(cat => (
              <button key={cat} className={styles.quickBtn} onClick={() => showToast(`Select your file`)}>
                {cat}
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
          {files.map(file => (
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
