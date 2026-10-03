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
  uploadFiles: (
    files: FileList | File[],
    category?: string
  ) => Promise<{ documents: Document[]; feedback: string[] }>;
}

const defaultSignals: SignalSummary = {
  missingTopics: 0,
  updatedNotices: 0,
  highPriorityTopics: 0,
  overallReadiness: 0,
};

const defaultDocuments: Document[] = [];
const defaultSubjects: SubjectCoverageSummary[] = [];
const defaultDeadlines: Deadline[] = [];

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
      if (Array.isArray(docs)) setDocuments(docs);
    } catch (err) {
      console.warn('Failed to fetch documents:', err);
    }
  }, []);

  const refreshTopics = useCallback(async () => {
    try {
      const subs = await apiClient.getTopics();
      if (Array.isArray(subs)) setSubjects(subs);
    } catch (err) {
      console.warn('Failed to fetch topics:', err);
    }
  }, []);

  const refreshDeadlines = useCallback(async () => {
    try {
      const res = await apiClient.getDeadlines();
      if (res && Array.isArray(res.deadlines)) {
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

  const uploadFiles = async (
    files: FileList | File[],
    category?: string
  ): Promise<{ documents: Document[]; feedback: string[] }> => {
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
