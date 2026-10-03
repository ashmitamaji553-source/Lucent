// lib/mockData.ts
import { UploadedFile, LegacyDeadline, TopicCoverage, Signal, StudyTask, ChatMessage, Resource } from './types';

export const mockFiles: UploadedFile[] = [
  { id: '1', name: 'DS_Syllabus.pdf', type: 'Syllabus', uploadedAt: new Date(Date.now() - 2 * 3600000), status: 'Processed' },
  { id: '2', name: 'Unit 3 Notes.pdf', type: 'Notes', uploadedAt: new Date(Date.now() - 3 * 3600000), status: 'Processed' },
  { id: '3', name: 'PYQ_2024.pdf', type: 'PYQs', uploadedAt: new Date(Date.now() - 5 * 3600000), status: 'Processed' },
  { id: '4', name: 'Notice_Sep18.pdf', type: 'Notice', uploadedAt: new Date(Date.now() - 5 * 3600000), status: 'Processed' },
];

export const mockDeadlines: LegacyDeadline[] = [
  { id: '1', title: 'DBMS Quiz', description: 'Prepare: SQL Joins, Normalization', date: new Date(Date.now() + 3 * 86400000), type: 'Quiz' },
  { id: '2', title: 'Assignment 2', description: 'Submission deadline', date: new Date(Date.now() + 5 * 86400000), type: 'Assignment' },
  { id: '3', title: 'Midterm Exam', description: 'Data Structures', date: new Date(Date.now() + 9 * 86400000), type: 'Exam' },
];

export const mockTopics: TopicCoverage[] = [
  {
    id: '1', subject: 'Data Structures', coverage: 82,
    subtopics: [
      { id: '1-1', name: 'Arrays', coverage: 95, pyqFrequency: 'High', difficulty: 'Easy' },
      { id: '1-2', name: 'Linked Lists', coverage: 88, pyqFrequency: 'High', difficulty: 'Medium' },
      {
        id: '1-3', name: 'Trees', coverage: 74, pyqFrequency: 'High', difficulty: 'Medium',
        children: [
          { id: '1-3-1', name: 'Binary Trees', coverage: 85, pyqFrequency: 'High', difficulty: 'Medium' },
          { id: '1-3-2', name: 'BST', coverage: 78, pyqFrequency: 'Medium', difficulty: 'Medium' },
          { id: '1-3-3', name: 'AVL Trees', coverage: 42, pyqFrequency: 'High', difficulty: 'Hard' },
        ]
      },
      { id: '1-4', name: 'Graphs', coverage: 55, pyqFrequency: 'Medium', difficulty: 'Hard' },
    ]
  },
  {
    id: '2', subject: 'Operating Systems', coverage: 61,
    subtopics: [
      { id: '2-1', name: 'Process Management', coverage: 78, pyqFrequency: 'High', difficulty: 'Medium' },
      { id: '2-2', name: 'Memory Management', coverage: 55, pyqFrequency: 'High', difficulty: 'Hard' },
      { id: '2-3', name: 'File Systems', coverage: 48, pyqFrequency: 'Medium', difficulty: 'Medium' },
      { id: '2-4', name: 'Deadlocks', coverage: 62, pyqFrequency: 'High', difficulty: 'Hard' },
    ]
  },
  {
    id: '3', subject: 'DBMS', coverage: 45,
    subtopics: [
      { id: '3-1', name: 'ER Modeling', coverage: 68, pyqFrequency: 'High', difficulty: 'Easy' },
      { id: '3-2', name: 'Normalization', coverage: 52, pyqFrequency: 'High', difficulty: 'Medium' },
      { id: '3-3', name: 'SQL', coverage: 44, pyqFrequency: 'High', difficulty: 'Medium' },
      { id: '3-4', name: 'Transactions', coverage: 22, pyqFrequency: 'High', difficulty: 'Hard' },
    ]
  },
  {
    id: '4', subject: 'Computer Networks', coverage: 38,
    subtopics: [
      { id: '4-1', name: 'OSI Model', coverage: 65, pyqFrequency: 'High', difficulty: 'Easy' },
      { id: '4-2', name: 'TCP/IP', coverage: 42, pyqFrequency: 'High', difficulty: 'Medium' },
      { id: '4-3', name: 'Routing', coverage: 28, pyqFrequency: 'Medium', difficulty: 'Hard' },
    ]
  },
  {
    id: '5', subject: 'Discrete Mathematics', coverage: 72,
    subtopics: [
      { id: '5-1', name: 'Logic & Proofs', coverage: 82, pyqFrequency: 'Medium', difficulty: 'Medium' },
      { id: '5-2', name: 'Graph Theory', coverage: 68, pyqFrequency: 'High', difficulty: 'Medium' },
      { id: '5-3', name: 'Combinatorics', coverage: 65, pyqFrequency: 'Medium', difficulty: 'Medium' },
    ]
  },
];

export const mockSignals: Signal = {
  missingTopics: 6,
  updatedNotices: 2,
  highPriorityTopics: 4,
  overallReadiness: 68,
};

export const mockStudyTasks: StudyTask[] = [
  { id: '1', title: 'Review AVL Trees', duration: '15 min', priority: 'High', type: 'Review' },
  { id: '2', title: 'DBMS Quiz', duration: 'In 3 days', dueDate: new Date(Date.now() + 3 * 86400000), priority: 'High', type: 'Quiz' },
  { id: '3', title: 'Assignment 2', duration: 'In 5 days', dueDate: new Date(Date.now() + 5 * 86400000), priority: 'Medium', type: 'Practice' },
  { id: '4', title: 'Midterm Exam', duration: 'In 9 days', dueDate: new Date(Date.now() + 9 * 86400000), priority: 'High', type: 'Quiz' },
  { id: '5', title: 'Read: Transactions & Concurrency', duration: '20 min', priority: 'Medium', type: 'Read' },
  { id: '6', title: 'Practice: Graph Algorithms', duration: '30 min', priority: 'Medium', type: 'Practice' },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm your Lucent Tutor. I've analyzed your uploaded materials — your Data Structures notes, 2024 PYQs, and course syllabus. What would you like to explore today?",
    sources: ['Unit 3 Notes', 'DS_Syllabus.pdf'],
    timestamp: new Date(Date.now() - 60000),
  }
];

export const mockResources: Resource[] = [
  { id: '1', title: 'AVL Trees — Visual Guide', type: 'Video', subject: 'Data Structures', url: '#', relevance: 'High' },
  { id: '2', title: 'SQL Joins Explained', type: 'Article', subject: 'DBMS', url: '#', relevance: 'High' },
  { id: '3', title: 'OS Process Scheduling Practice', type: 'Quiz', subject: 'Operating Systems', url: '#', relevance: 'Medium' },
  { id: '4', title: 'Graph Theory Fundamentals', type: 'PDF', subject: 'Discrete Mathematics', url: '#', relevance: 'Medium' },
  { id: '5', title: 'TCP/IP in 15 Minutes', type: 'Video', subject: 'Computer Networks', url: '#', relevance: 'High' },
  { id: '6', title: 'Database Normalization 3NF', type: 'Article', subject: 'DBMS', url: '#', relevance: 'High' },
];

export function getRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} hour${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function getDaysUntil(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `In ${days} days`;
}

export function getDateLabel(dateInput: Date | string): { month: string; day: string } {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
}
