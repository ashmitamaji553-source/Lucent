// src/lib/db/index.ts
// Minimal, reliable, self-contained database store for Lucent production
import fs from 'fs';
import path from 'path';
import {
  User,
  Course,
  Document,
  Topic,
  TopicRelationship,
  Coverage,
  PYQQuestion,
  Deadline,
  Conflict,
  StudyPlanItem,
  Resource,
  TutorConversation,
  TutorMessage,
} from '../models/types';

export interface DatabaseSchema {
  users: User[];
  courses: Course[];
  documents: Document[];
  topics: Topic[];
  topicRelationships: TopicRelationship[];
  coverages: Coverage[];
  pyqQuestions: PYQQuestion[];
  deadlines: Deadline[];
  conflicts: Conflict[];
  studyPlanItems: StudyPlanItem[];
  resources: Resource[];
  tutorConversations: TutorConversation[];
  tutorMessages: TutorMessage[];
}

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.VERCEL
  ? path.join('/tmp', '.lucent')
  : path.join(process.cwd(), '.lucent');

export const DB_FILE = path.join(DATA_DIR, 'db.json');

export function getEmptyDatabase(): DatabaseSchema {
  const now = new Date();
  const nowIso = now.toISOString();

  const user: User = {
    id: 'user_1',
    name: 'Scholar',
    email: '',
    avatar: 'S',
    examDate: '',
    dailyStudyGoalMinutes: 180,
    deadlineReminders: true,
    coverageAlerts: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    users: [user],
    courses: [],
    documents: [],
    topics: [],
    topicRelationships: [],
    coverages: [],
    pyqQuestions: [],
    deadlines: [],
    conflicts: [],
    studyPlanItems: [],
    resources: [],
    tutorConversations: [],
    tutorMessages: [],
  };
}

class Database {
  private cache: DatabaseSchema | null = null;
  private lastMtime: number = 0;
  private writeLock: Promise<void> = Promise.resolve();

  private ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create data directory:', e);
    }
  }

  public read(): DatabaseSchema {
    this.ensureDirectory();
    try {
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        if (this.cache && stats.mtimeMs === this.lastMtime) {
          return this.cache;
        }
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        this.cache = parsed;
        this.lastMtime = stats.mtimeMs;
        return parsed;
      }
    } catch (e) {
      console.warn('Could not parse db.json, returning empty database fallback:', e);
    }

    const seed = getEmptyDatabase();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      if (fs.existsSync(DB_FILE)) {
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      }
    } catch (err) {
      console.warn('Could not write initial DB file to disk:', err);
    }
    this.cache = seed;
    return seed;
  }

  public async write(data: DatabaseSchema): Promise<void> {
    this.cache = data;
    this.ensureDirectory();
    try {
      // Atomic file write
      const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
      await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      await fs.promises.rename(tempFile, DB_FILE);
      if (fs.existsSync(DB_FILE)) {
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      }
    } catch (err) {
      console.warn('Database disk write error (continuing with in-memory state):', err);
    }
  }

  public async update<T>(fn: (db: DatabaseSchema) => T | Promise<T>): Promise<T> {
    const prevLock = this.writeLock;
    let resolveLock!: () => void;
    this.writeLock = new Promise<void>((res) => {
      resolveLock = res;
    });

    try {
      await prevLock;
      const current = this.read();
      const result = await fn(current);
      await this.write(current);
      return result;
    } finally {
      resolveLock();
    }
  }

  public resetToEmpty(): void {
    const empty = getEmptyDatabase();
    this.cache = empty;
    this.ensureDirectory();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write reset empty DB to disk:', err);
    }
  }
}

export const db = new Database();
