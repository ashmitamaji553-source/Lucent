// src/services/plan-store.ts
// Shared persistence for active AI study plans, completed sessions, and feedback log across API routes

import fs from 'fs';
import path from 'path';
import { AiPlanResponse } from './ai-planner';
import { AdaptationDetails } from './adaptation-service';

const PLAN_FILE = path.join(process.cwd(), '.lucent', 'active_plan.json');

export interface FeedbackRecord {
  sessionId?: string;
  subject: string;
  topic: string;
  status: 'understood' | 'needs_practice' | 'struggled';
  timestamp: string;
}

export interface StoredPlanState {
  plan: AiPlanResponse;
  lastAdaptation?: AdaptationDetails;
  completedSessionKeys?: string[];
  feedbackLog?: FeedbackRecord[];
  updatedAt: string;
}

class PlanStore {
  private inMemoryCache: StoredPlanState | null = null;

  public getActivePlan(): AiPlanResponse | null {
    if (this.inMemoryCache) {
      return this.inMemoryCache.plan;
    }

    try {
      if (fs.existsSync(PLAN_FILE)) {
        const raw = fs.readFileSync(PLAN_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as StoredPlanState;
        this.inMemoryCache = {
          ...parsed,
          completedSessionKeys: parsed.completedSessionKeys || [],
          feedbackLog: parsed.feedbackLog || [],
        };
        return parsed.plan;
      }
    } catch (e) {
      console.warn('Could not read cached plan:', e);
    }

    return null;
  }

  public getLastAdaptation(): AdaptationDetails | undefined {
    this.getActivePlan();
    const cache: StoredPlanState | null = this.inMemoryCache;
    return cache?.lastAdaptation;
  }

  public getCompletedSessionsMap(): Record<string, boolean> {
    this.getActivePlan();
    const keys = this.inMemoryCache?.completedSessionKeys || [];
    const map: Record<string, boolean> = {};
    keys.forEach((k) => {
      map[k] = true;
    });
    return map;
  }

  public getFeedbackLog(): FeedbackRecord[] {
    this.getActivePlan();
    return this.inMemoryCache?.feedbackLog || [];
  }

  public setActivePlan(plan: AiPlanResponse, adaptation?: AdaptationDetails): void {
    const existing = this.inMemoryCache;
    const state: StoredPlanState = {
      plan,
      lastAdaptation: adaptation || existing?.lastAdaptation,
      completedSessionKeys: existing?.completedSessionKeys || [],
      feedbackLog: existing?.feedbackLog || [],
      updatedAt: new Date().toISOString(),
    };

    this.saveState(state);
  }

  public markSession(sessionKey: string, completed: boolean = true): void {
    this.getActivePlan();
    if (!this.inMemoryCache) return;

    const currentKeys = new Set(this.inMemoryCache.completedSessionKeys || []);
    if (completed) {
      currentKeys.add(sessionKey);
    } else {
      currentKeys.delete(sessionKey);
    }

    this.inMemoryCache.completedSessionKeys = Array.from(currentKeys);
    this.inMemoryCache.updatedAt = new Date().toISOString();
    this.saveState(this.inMemoryCache);
  }

  public addFeedback(record: FeedbackRecord): void {
    this.getActivePlan();
    if (!this.inMemoryCache) return;

    const currentLog = this.inMemoryCache.feedbackLog || [];
    this.inMemoryCache.feedbackLog = [record, ...currentLog];
    if (record.sessionId) {
      const currentKeys = new Set(this.inMemoryCache.completedSessionKeys || []);
      currentKeys.add(record.sessionId);
      this.inMemoryCache.completedSessionKeys = Array.from(currentKeys);
    }
    this.inMemoryCache.updatedAt = new Date().toISOString();
    this.saveState(this.inMemoryCache);
  }

  private saveState(state: StoredPlanState): void {
    this.inMemoryCache = state;
    try {
      const dir = path.dirname(PLAN_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(PLAN_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist active plan to file:', e);
    }
  }
}

export const planStore = new PlanStore();
