// lib/types.ts
export interface UploadedFile {
  id: string;
  name: string;
  type: 'Syllabus' | 'Notes' | 'PYQs' | 'Notice' | 'Other';
  uploadedAt: Date;
  status: 'Processing' | 'Processed' | 'Error';
  size?: number;
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'Quiz' | 'Assignment' | 'Exam' | 'Project' | 'Other';
}

export interface TopicCoverage {
  id: string;
  subject: string;
  coverage: number;
  subtopics?: SubTopic[];
}

export interface SubTopic {
  id: string;
  name: string;
  coverage: number;
  pyqFrequency: 'High' | 'Medium' | 'Low' | 'None';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prerequisites?: string[];
  children?: SubTopic[];
}

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
  dueDate?: Date;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Review' | 'Practice' | 'Read' | 'Quiz';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface Resource {
  id: string;
  title: string;
  type: 'Video' | 'Article' | 'PDF' | 'Quiz';
  subject: string;
  url: string;
  relevance: 'High' | 'Medium';
}
