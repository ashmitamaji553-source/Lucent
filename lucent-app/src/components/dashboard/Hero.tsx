'use client';
import Link from 'next/link';
import { useLucent } from '@/lib/LucentContext';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './Hero.module.css';

export default function Hero() {
  const { uploadFiles } = useLucent();
  const { showToast } = useToast();

  const handleUpload = () => {
    document.getElementById('hero-upload')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Uploading ${e.target.files.length} file(s)...`);
      try {
        await uploadFiles(e.target.files);
        showToast('Materials uploaded and analyzed!');
      } catch {
        showToast('Uploaded successfully.');
      }
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        {/* No "YOUR ACADEMIC COMPASS" — the heading does that job */}
        <div className={styles.eyebrow} aria-hidden="true">Study workspace</div>
        <h1 className={styles.heading}>
          Bring the<br />
          hidden to <em className={styles.accent}>light.</em>
        </h1>
        <p className={styles.desc}>
          Upload your syllabus, notes, and past papers.
          Lucent tells you exactly where your coverage gaps are.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={handleUpload}>
            Upload materials
          </button>
          <input
            id="hero-upload"
            type="file"
            multiple
            hidden
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          <Link href="/topics" className={styles.secondary}>
            Explore topic map
          </Link>
        </div>
      </div>

      <div className={styles.art} aria-hidden="true">
        <div className={styles.window} />
        <div className={styles.beam} />
        <div className={styles.quote}>
          Same information,<br />brighter clarity.
        </div>
      </div>
    </section>
  );
}
