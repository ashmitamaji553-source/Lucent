// src/lib/LucentContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Document,
  SignalSummary,
  SubjectCoverageSummary,
  Deadline,
  Conflict,
} from './models/types';
import { apiClient } from './api-client';
import { mockSignals, mockFiles, mockDeadlines, mockTopics } from './mockData';

interface LucentContextType {
  signals: SignalSummary;
  documents: Document[];
  subjects: SubjectCoverageSummary[];
  deadlines: Deadline[];
  conflicts: Conflict[];
  isLoading: boolean;
  refreshSignals: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  refreshDeadlines: () => Promise<void>;
  refreshAll: () => Promise<void>;
  uploadFiles: (files: FileList | File[], category?: string) => Promise<Document[]>;
}

const defaultSignals: SignalSummary = {
  missingTopics: mockSignals.missingTopics,
  updatedNotices: mockSignals.updatedNotices,
  highPriorityTopics: mockSignals.highPriorityTopics,
  overallReadiness: mockSignals.overallReadiness,
};

const defaultDocuments: Document[] = mockFiles.map((f) => ({
  id: f.id,
  userId: 'user_1',
  courseId: 'c_ds',
  name: f.name,
  type: f.type,
  fileSize: 500000,
  mimeType: 'application/pdf',
  status: f.status as any,
  uploadedAt: typeof f.uploadedAt === 'string' ? f.uploadedAt : f.uploadedAt.toISOString(),
}));

const defaultSubjects: SubjectCoverageSummary[] = (mockTopics as any[]).map((t) => ({
  id: t.id,
  subject: t.subject,
  coverage: t.coverage,
  subtopics: ((t.subtopics || []) as any[]).map((st: any) => ({
    id: st.id,
    courseId: t.id,
    parentTopicId: null,
    name: st.name,
    orderIndex: 1,
    depth: 1,
    pyqFrequency: st.pyqFrequency,
    difficulty: st.difficulty,
    coverage: st.coverage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: ((st.children || []) as any[]).map((ch: any) => ({
      id: ch.id,
      courseId: t.id,
      parentTopicId: st.id,
      name: ch.name,
      orderIndex: 1,
      depth: 2,
      pyqFrequency: ch.pyqFrequency,
      difficulty: ch.difficulty,
      coverage: ch.coverage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  })),
}));

const defaultDeadlines: Deadline[] = (mockDeadlines as any[]).map((d: any) => ({
  id: d.id,
  userId: 'user_1',
  title: d.title,
  description: d.description,
  dueDate: typeof d.date === 'string' ? d.date : d.date instanceof Date ? d.date.toISOString() : new Date().toISOString(),
  date: d.date,
  type: d.type,
  status: 'pending',
  createdAt: new Date().toISOString(),
}));

const LucentContext = createContext<LucentContextType | null>(null);

export function LucentProvider({ children }: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<SignalSummary>(defaultSignals);
  const [documents, setDocuments] = useState<Document[]>(defaultDocuments);
  const [subjects, setSubjects] = useState<SubjectCoverageSummary[]>(defaultSubjects);
  const [deadlines, setDeadlines] = useState<Deadline[]>(defaultDeadlines);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSignals = useCallback(async () => {
    try {
      const sigs = await apiClient.getSignals();
      if (sigs) setSignals(sigs);
    } catch (err) {
      console.warn('Failed to fetch signals:', err);
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await apiClient.getDocuments();
      if (docs && docs.length > 0) setDocuments(docs);
    } catch (err) {
      console.warn('Failed to fetch documents:', err);
    }
  }, []);

  const refreshTopics = useCallback(async () => {
    try {
      const subs = await apiClient.getTopics();
      if (subs && subs.length > 0) setSubjects(subs);
    } catch (err) {
      console.warn('Failed to fetch topics:', err);
    }
  }, []);

  const refreshDeadlines = useCallback(async () => {
    try {
      const res = await apiClient.getDeadlines();
      if (res.deadlines && res.deadlines.length > 0) {
        setDeadlines(res.deadlines);
        setConflicts(res.conflicts || []);
      }
    } catch (err) {
      console.warn('Failed to fetch deadlines:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([
      refreshSignals(),
      refreshDocuments(),
      refreshTopics(),
      refreshDeadlines(),
    ]);
    setIsLoading(false);
  }, [refreshSignals, refreshDocuments, refreshTopics, refreshDeadlines]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const uploadFiles = async (files: FileList | File[], category?: string): Promise<Document[]> => {
    const uploaded = await apiClient.uploadDocuments(files, category);
    await refreshAll();
    return uploaded;
  };

  return (
    <LucentContext.Provider
      value={{
        signals,
        documents,
        subjects,
        deadlines,
        conflicts,
        isLoading,
        refreshSignals,
        refreshDocuments,
        refreshTopics,
        refreshDeadlines,
        refreshAll,
        uploadFiles,
      }}
    >
      {children}
    </LucentContext.Provider>
  );
}

export function useLucent() {
  const ctx = useContext(LucentContext);
  if (!ctx) {
    throw new Error('useLucent must be used within a LucentProvider');
  }
  return ctx;
}
