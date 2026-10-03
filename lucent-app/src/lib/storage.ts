// src/lib/storage.ts
// Robust client-side localStorage persistence for Lucent MVP
// Ensures page refreshes never destroy demo state, even across offline network blips.

const KEYS = {
  PLAN: 'lucent_study_plan_v1',
  SESSIONS: 'lucent_completed_sessions_v1',
  ADAPTATION: 'lucent_last_adaptation_v1',
  FEEDBACK: 'lucent_feedback_history_v1',
  SETUP: 'lucent_setup_config_v1',
} as const;

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeGetItem<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Lucent Storage] Failed to read key "${key}":`, err);
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Lucent Storage] Failed to write key "${key}":`, err);
  }
}

export const lucentStorage = {
  // 1. Study Plan
  getPlan<T = any>(): T | null {
    return safeGetItem<T | null>(KEYS.PLAN, null);
  },
  savePlan<T = any>(plan: T): void {
    safeSetItem(KEYS.PLAN, plan);
  },

  // 2. Completed Sessions State (Record of sessionKey -> boolean)
  getCompletedSessions(): Record<string, boolean> {
    return safeGetItem<Record<string, boolean>>(KEYS.SESSIONS, {});
  },
  saveCompletedSessions(sessions: Record<string, boolean>): void {
    safeSetItem(KEYS.SESSIONS, sessions);
  },
  setSessionCompleted(sessionKey: string, completed: boolean = true): Record<string, boolean> {
    const current = this.getCompletedSessions();
    const updated = { ...current, [sessionKey]: completed };
    this.saveCompletedSessions(updated);
    return updated;
  },

  // 3. Last Adapted Plan Details
  getAdaptation<T = any>(): T | null {
    return safeGetItem<T | null>(KEYS.ADAPTATION, null);
  },
  saveAdaptation<T = any>(adaptation: T | null): void {
    safeSetItem(KEYS.ADAPTATION, adaptation);
  },

  // 4. Feedback History
  getFeedbackHistory<T = any>(): T[] {
    return safeGetItem<T[]>(KEYS.FEEDBACK, []);
  },
  recordFeedback<T = any>(feedbackItem: T): T[] {
    const current = this.getFeedbackHistory<T>();
    const updated = [feedbackItem, ...current];
    safeSetItem(KEYS.FEEDBACK, updated);
    return updated;
  },

  // 5. Setup Form Inputs (Exam Date, Hours/Day, Subjects, Topics)
  getSetupConfig<T = any>(): T | null {
    return safeGetItem<T | null>(KEYS.SETUP, null);
  },
  saveSetupConfig<T = any>(config: T): void {
    safeSetItem(KEYS.SETUP, config);
  },

  // Clear demo state if needed
  clearDemoState(): void {
    if (!isClient()) return;
    try {
      Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('[Lucent Storage] Failed to clear demo state:', e);
    }
  },
};
