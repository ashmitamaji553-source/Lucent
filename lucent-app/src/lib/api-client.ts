// src/lib/api-client.ts
// Clean client-side API helper functions for Lucent services

import {
  Document,
  SignalSummary,
  SubjectCoverageSummary,
  Deadline,
  Conflict,
  StudyPlanItem,
  Resource,
  TutorMessage,
  User,
} from './models/types';

export const apiClient = {
  // Signals
  async getSignals(): Promise<SignalSummary> {
    const res = await fetch('/api/signals');
    const data = await res.json();
    return data.signals;
  },

  // Documents
  async getDocuments(): Promise<Document[]> {
    const res = await fetch('/api/documents');
    const data = await res.json();
    return data.documents || [];
  },

  async uploadDocuments(
    files: FileList | File[],
    category: string = 'Other'
  ): Promise<{ documents: Document[]; feedback: string[] }> {
    const formData = new FormData();
    formData.append('category', category);
    Array.from(files).forEach((f) => formData.append('files', f));

    const res = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return {
      documents: data.documents || [],
      feedback: data.feedback || [],
    };
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  // Topics & Coverage
  async getTopics(): Promise<SubjectCoverageSummary[]> {
    const res = await fetch('/api/topics');
    const data = await res.json();
    return data.subjects || [];
  },

  async studyTopic(topicId: string, pointsGained: number = 5): Promise<number> {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'study', topicId, pointsGained }),
    });
    const data = await res.json();
    return data.newScore;
  },

  // Deadlines
  async getDeadlines(): Promise<{ deadlines: Deadline[]; conflicts: Conflict[] }> {
    const res = await fetch('/api/deadlines');
    const data = await res.json();
    return { deadlines: data.deadlines || [], conflicts: data.conflicts || [] };
  },

  async addDeadline(deadline: { title: string; description: string; dueDate: string; type: string }): Promise<Deadline> {
    const res = await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deadline),
    });
    const data = await res.json();
    return data.deadline;
  },

  // Study Plan
  async getPlan(): Promise<{
    summary?: string;
    days?: Array<{
      date: string;
      totalMinutes: number;
      sessions: Array<{
        subject: string;
        topic: string;
        duration: number;
        type: 'Learn' | 'Practice' | 'Revision';
      }>;
    }>;
    todayTasks: StudyPlanItem[];
    upcomingTasks: StudyPlanItem[];
    focusAreas: string[];
    studyTip: string;
    conflicts: Conflict[];
  }> {
    const res = await fetch('/api/plan');
    return res.json();
  },

  async createPlan(input: {
    examDate?: string;
    hoursPerDay?: number;
    subjects?: string[];
    topics?: any[];
    confidence?: Record<string, string>;
  }): Promise<{
    summary: string;
    days: Array<{
      date: string;
      totalMinutes: number;
      sessions: Array<{
        subject: string;
        topic: string;
        duration: number;
        type: 'Learn' | 'Practice' | 'Revision';
      }>;
    }>;
  }> {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async togglePlanItem(id: string): Promise<StudyPlanItem> {
    const res = await fetch('/api/plan/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return data.item;
  },

  async regeneratePlan(input?: any): Promise<any> {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input || {}),
    });
    return res.json();
  },

  // Resources
  async getResources(): Promise<Array<{ subject: string; resources: Resource[] }>> {
    const res = await fetch('/api/resources');
    const data = await res.json();
    return data.subjects || [];
  },

  // Tutor
  async getTutorHistory(): Promise<{ messages: TutorMessage[]; conversation: any }> {
    const res = await fetch('/api/tutor');
    return res.json();
  },

  async askTutor(question: string, conversationId?: string): Promise<{
    message: TutorMessage;
    contextSources: string[];
    suggestedQuestions: string[];
  }> {
    const res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, conversationId }),
    });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<User> {
    const res = await fetch('/api/settings');
    const data = await res.json();
    return data.user;
  },

  async updateSettings(updates: Partial<User>): Promise<User> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.user;
  },

  // Search
  async search(q: string): Promise<Array<{ type: string; title: string; subtitle: string; url: string }>> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.results || [];
  },
};
