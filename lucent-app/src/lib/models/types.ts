// src/lib/models/types.ts
// Core clean data models for Lucent MVP

export type DocumentType = 'Syllabus' | 'Notes' | 'PYQs' | 'Notice' | 'Other';
export type ProcessingStatus = 'Uploading' | 'Processing' | 'Processed' | 'Error';
export type FrequencyLevel = 'High' | 'Medium' | 'Low' | 'None';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type DeadlineType = 'Quiz' | 'Assignment' | 'Exam' | 'Project' | 'Other';
export type PlanItemType = 'Review' | 'Practice' | 'Read' | 'Quiz';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type ResourceType = 'Video' | 'Article' | 'PDF' | 'Quiz';
export type RelationshipType = 'prerequisite' | 'related' | 'builds_on';

// 1. User
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  examDate?: string; // ISO date string
  dailyStudyGoalMinutes: number; // e.g., 180 for 3 hours
  deadlineReminders: boolean;
  coverageAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

// 2. Course
export interface Course {
  id: string;
  userId: string;
  name: string; // e.g. "Data Structures", "DBMS"
  code?: string; // e.g. "CS201"
  term?: string; // e.g. "Fall 2026"
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 3. Document
export interface Document {
  id: string;
  userId: string;
  courseId: string;
  name: string;
  type: DocumentType;
  fileSize: number;
  mimeType: string;
  rawText?: string;
  extractedSummary?: string;
  status: ProcessingStatus;
  uploadedAt: string;
  metadata?: {
    topicsFound?: string[];
    deadlinesFound?: string[];
    term?: string;
    year?: number;
    pageCount?: number;
  };
}

// 4. Topic
export interface Topic {
  id: string;
  courseId: string;
  parentTopicId?: string | null;
  name: string;
  description?: string;
  orderIndex: number;
  depth: number;
  pyqFrequency: FrequencyLevel;
  difficulty: DifficultyLevel;
  createdAt: string;
  updatedAt: string;
}

// 5. TopicRelationship
export interface TopicRelationship {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  relationshipType: RelationshipType;
}

// 6. Coverage
export interface Coverage {
  id: string;
  userId: string;
  topicId: string;
  score: number; // 0 - 100
  status: 'weak' | 'moderate' | 'strong';
  confidenceScore?: number;
  lastAssessedAt: string;
}

// 7. PYQQuestion
export interface PYQQuestion {
  id: string;
  courseId: string;
  topicId?: string;
  documentId?: string;
  year: number;
  term?: string;
  questionText: string;
  marks?: number;
  frequencyWeight: number; // 1 - 5
}

// 8. Deadline
export interface Deadline {
  id: string;
  userId: string;
  courseId?: string;
  documentId?: string; // if extracted from a notice
  title: string;
  description: string;
  dueDate: string; // ISO date string
  date?: string | Date; // optional alias for UI backwards compatibility
  type: DeadlineType;
  status: 'pending' | 'completed';
  createdAt: string;
}

// 9. Conflict
export interface Conflict {
  id: string;
  userId: string;
  deadlineId1: string;
  deadlineId2: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  resolved: boolean;
  createdAt: string;
}

// 10. StudyPlanItem
export interface StudyPlanItem {
  id: string;
  userId: string;
  topicId?: string;
  deadlineId?: string;
  title: string;
  duration: string; // e.g. "15 min", "In 3 days"
  durationMinutes: number;
  dueDate?: string; // ISO date string
  scheduledDate?: string; // ISO date string for when it is planned
  priority: PriorityLevel;
  type: PlanItemType;
  completed: boolean;
  orderIndex: number;
  createdAt: string;
}

// 11. Resource
export interface Resource {
  id: string;
  topicId?: string;
  courseId?: string;
  title: string;
  type: ResourceType;
  subject: string;
  url: string;
  relevance: 'High' | 'Medium';
  description?: string;
}

// 12. TutorConversation
export interface TutorConversation {
  id: string;
  userId: string;
  courseId?: string;
  title: string;
  currentTopicId?: string;
  createdAt: string;
  updatedAt: string;
}

// 13. TutorMessage
export interface TutorMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string[];
  suggestedQuestions?: string[];
  timestamp: string;
}

// Composite types used across UI components
export interface TopicWithSubtopics extends Topic {
  coverage: number;
  children?: TopicWithSubtopics[];
}

export interface SubjectCoverageSummary {
  id: string;
  subject: string;
  coverage: number;
  subtopics: TopicWithSubtopics[];
}

export interface SignalSummary {
  missingTopics: number;
  updatedNotices: number;
  highPriorityTopics: number;
  overallReadiness: number;
}
