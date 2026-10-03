// src/services/plan-store.ts
// Shared persistence for the active AI study plan across API routes

import fs from 'fs';
import path from 'path';
import { AiPlanResponse, PlanSession } from './ai-planner';
import { AdaptedPlanResponse, AdaptationDetails } from './adaptation-service';

const PLAN_FILE = path.join(process.cwd(), '.lucent', 'active_plan.json');

export interface StoredPlanState {
  plan: AiPlanResponse;
  lastAdaptation?: AdaptationDetails;
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
        this.inMemoryCache = parsed;
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

  public setActivePlan(plan: AiPlanResponse, adaptation?: AdaptationDetails): void {
    const state: StoredPlanState = {
      plan,
      lastAdaptation: adaptation,
      updatedAt: new Date().toISOString(),
    };

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
