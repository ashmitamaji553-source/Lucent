// src/lib/types.ts
// Compatibility layer re-exporting clean models and legacy types
export * from './models/types';

export interface UploadedFile {
  id: string;
  name: string;
  type: 'Syllabus' | 'Notes' | 'PYQs' | 'Notice' | 'Other';
  uploadedAt: Date | string;
  status: 'Uploading' | 'Processing' | 'Processed' | 'Error';
  size?: number;
}

export interface LegacyDeadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'Quiz' | 'Assignment' | 'Exam' | 'Project' | 'Other';
}

export interface LegacySubTopic {
  id: string;
  name: string;
  coverage: number;
  pyqFrequency: 'High' | 'Medium' | 'Low' | 'None';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prerequisites?: string[];
  children?: LegacySubTopic[];
}

export type SubTopic = LegacySubTopic;

export interface LegacyTopicCoverage {
  id: string;
  subject: string;
  coverage: number;
  subtopics?: LegacySubTopic[];
}

export type TopicCoverage = LegacyTopicCoverage;

export interface Signal {
  missingTopics: number;
  updatedNotices: number;
  highPriorityTopics: number;
  overallReadiness: number;
}

export interface StudyTask {
  id: string;
  title: string;
  duration: string;
  dueDate?: Date | string;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Review' | 'Practice' | 'Read' | 'Quiz';
  completed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string[];
  timestamp: Date | string;
}

export interface LegacyResource {
  id: string;
  title: string;
  type: 'Video' | 'Article' | 'PDF' | 'Quiz';
  subject: string;
  url: string;
  relevance: 'High' | 'Medium';
}

export type Resource = LegacyResource;
