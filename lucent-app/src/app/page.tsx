import Hero from '@/components/dashboard/Hero';
import SignalCards from '@/components/dashboard/SignalCards';
import MaterialUpload from '@/components/dashboard/MaterialUpload';
import RecentUploads from '@/components/dashboard/RecentUploads';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import TopicCoverage from '@/components/dashboard/TopicCoverage';
import QuickAccess from '@/components/dashboard/QuickAccess';
import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <Hero />
      <div className={styles.inner}>
        <SignalCards />

        <div className={styles.grid}>
          <MaterialUpload />
          <RecentUploads />
        </div>

        <div className={styles.bottomGrid}>
          <UpcomingDeadlines />
          <TopicCoverage />
          <QuickAccess />
        </div>
      </div>
    </div>
  );
}
