// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Metadata = any;
import './globals.css';
import styles from './layout.module.css';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ToastProvider from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Lucent — Study Workspace',
  description: 'Upload your study material, and let Lucent show you what you know, what you\'re missing, and what truly matters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className={styles.app}>
            <Sidebar />
            <div className={styles.mainWrapper}>
              <Topbar />
              <main className={styles.main}>
                {children}
              </main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
