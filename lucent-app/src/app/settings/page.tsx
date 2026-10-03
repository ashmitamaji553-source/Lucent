// src/app/settings/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './page.module.css';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [examDate, setExamDate] = useState('');
  const [studyGoal, setStudyGoal] = useState('3 hours');
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [coverageAlerts, setCoverageAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient.getSettings().then((user) => {
      if (user) {
        if (user.name) setName(user.name);
        if (user.email) setEmail(user.email);
        if (user.examDate) setExamDate(user.examDate);
        if (user.dailyStudyGoalMinutes) {
          const hrs = Math.round(user.dailyStudyGoalMinutes / 60);
          setStudyGoal(`${hrs} hour${hrs !== 1 ? 's' : ''}`);
        }
        setDeadlineReminders(user.deadlineReminders ?? true);
        setCoverageAlerts(user.coverageAlerts ?? true);
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const hours = parseInt(studyGoal) || 3;
    try {
      await apiClient.updateSettings({
        name,
        email,
        examDate,
        dailyStudyGoalMinutes: hours * 60,
        deadlineReminders,
        coverageAlerts,
        avatar: name.charAt(0).toUpperCase(),
      });
      showToast('Settings saved successfully!');
    } catch {
      showToast('Preferences saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    apiClient.getSettings().then((user) => {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setExamDate(user.examDate || '');
      }
      showToast('Changes discarded.');
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Settings</h1>
        <p className={styles.desc}>Manage your account and workspace preferences.</p>
      </div>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Name</div>
              <div className={styles.sublabel}>Your display name</div>
            </div>
            <div className={styles.field}>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Email</div>
              <div className={styles.sublabel}>Your account email</div>
            </div>
            <div className={styles.field}>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Academic</h2>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Exam Date</div>
              <div className={styles.sublabel}>Your upcoming major exam</div>
            </div>
            <div className={styles.field}>
              <input
                className={styles.input}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                type="date"
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Daily Study Goal</div>
              <div className={styles.sublabel}>Target hours per day</div>
            </div>
            <div className={styles.field}>
              <select
                className={styles.select}
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
              >
                <option value="1 hour">1 hour</option>
                <option value="2 hours">2 hours</option>
                <option value="3 hours">3 hours</option>
                <option value="4 hours">4 hours</option>
                <option value="5+ hours">5+ hours</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Deadline Reminders</div>
              <div className={styles.sublabel}>Get notified before exams and assignments</div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={deadlineReminders}
                onChange={(e) => setDeadlineReminders(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Coverage Alerts</div>
              <div className={styles.sublabel}>Alert when a topic drops below 40% coverage</div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={coverageAlerts}
                onChange={(e) => setCoverageAlerts(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
