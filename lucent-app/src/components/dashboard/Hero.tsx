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
      {/* Prism atmospheric effects */}
      <div className={styles.prism1} aria-hidden="true" />
      <div className={styles.prism2} aria-hidden="true" />

      <div className={styles.copy}>
        <div className={styles.eyebrow}>YOUR ACADEMIC COMPASS</div>
        <h1 className={styles.heading}>
          Bring the<br />
          hidden to <em className={styles.accent}>light.</em>
        </h1>
        <p className={styles.desc}>
          Upload your study material, and let Lucent show you what you know,
          what you're missing, and what truly matters.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={handleUpload}>
            ↑&nbsp; Upload My Materials &nbsp;→
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
            ▷&nbsp; See a Demo
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
