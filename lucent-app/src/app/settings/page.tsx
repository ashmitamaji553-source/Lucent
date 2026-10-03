import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>PREFERENCES</div>
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
              <input className={styles.input} defaultValue="Ashmita" type="text" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Email</div>
              <div className={styles.sublabel}>Your account email</div>
            </div>
            <div className={styles.field}>
              <input className={styles.input} defaultValue="ashmita@example.com" type="email" />
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
              <input className={styles.input} type="date" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Daily Study Goal</div>
              <div className={styles.sublabel}>Target hours per day</div>
            </div>
            <div className={styles.field}>
              <select className={styles.select} defaultValue="3 hours">
                <option>1 hour</option>
                <option>2 hours</option>
                <option>3 hours</option>
                <option>4 hours</option>
                <option>5+ hours</option>
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
              <input type="checkbox" defaultChecked />
              <span className={styles.slider} />
            </label>
          </div>
          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <div className={styles.label}>Coverage Alerts</div>
              <div className={styles.sublabel}>Alert when a topic drops below 40% coverage</div>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.slider} />
            </label>
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.saveBtn}>Save Changes</button>
          <button className={styles.cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
