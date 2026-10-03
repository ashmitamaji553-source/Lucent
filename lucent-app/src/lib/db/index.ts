// src/lib/db/index.ts
// Minimal, reliable, self-contained database store for Lucent MVP
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

const DATA_DIR = path.join(process.cwd(), '.lucent');
const DB_FILE = path.join(process.cwd(), '.lucent', 'db.json');

function getInitialSeedData(): DatabaseSchema {
  const now = new Date();
  const nowIso = now.toISOString();

  const user: User = {
    id: 'user_1',
    name: 'Ashmita',
    email: 'ashmita@example.com',
    avatar: 'A',
    examDate: new Date(now.getTime() + 9 * 86400000).toISOString().split('T')[0],
    dailyStudyGoalMinutes: 180,
    deadlineReminders: true,
    coverageAlerts: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const courses: Course[] = [
    { id: 'c_ds', userId: user.id, name: 'Data Structures', code: 'CS201', term: 'Fall 2026', createdAt: nowIso, updatedAt: nowIso },
    { id: 'c_os', userId: user.id, name: 'Operating Systems', code: 'CS202', term: 'Fall 2026', createdAt: nowIso, updatedAt: nowIso },
    { id: 'c_dbms', userId: user.id, name: 'DBMS', code: 'CS203', term: 'Fall 2026', createdAt: nowIso, updatedAt: nowIso },
    { id: 'c_cn', userId: user.id, name: 'Computer Networks', code: 'CS204', term: 'Fall 2026', createdAt: nowIso, updatedAt: nowIso },
    { id: 'c_dm', userId: user.id, name: 'Discrete Mathematics', code: 'CS205', term: 'Fall 2026', createdAt: nowIso, updatedAt: nowIso },
  ];

  const documents: Document[] = [
    {
      id: 'doc_1',
      userId: user.id,
      courseId: 'c_ds',
      name: 'DS_Syllabus.pdf',
      type: 'Syllabus',
      fileSize: 420000,
      mimeType: 'application/pdf',
      rawText: 'Course Outline: Arrays, Linked Lists, Trees (Binary Trees, BST, AVL Trees), Graphs, Sorting Algorithms.',
      extractedSummary: 'Full Data Structures curriculum covering Units 1 through 5.',
      status: 'Processed',
      uploadedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      metadata: { topicsFound: ['Arrays', 'Linked Lists', 'Trees', 'Graphs'], year: 2026 },
    },
    {
      id: 'doc_2',
      userId: user.id,
      courseId: 'c_ds',
      name: 'Unit 3 Notes.pdf',
      type: 'Notes',
      fileSize: 1250000,
      mimeType: 'application/pdf',
      rawText: 'Unit 3: Hierarchical Structures. Binary Search Trees properties, balancing with AVL rotations (LL, RR, LR, RL), height factor.',
      extractedSummary: 'Detailed notes on Trees, BST balancing, and AVL tree rotations.',
      status: 'Processed',
      uploadedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      metadata: { topicsFound: ['Trees', 'Binary Trees', 'BST', 'AVL Trees'] },
    },
    {
      id: 'doc_3',
      userId: user.id,
      courseId: 'c_ds',
      name: 'PYQ_2024.pdf',
      type: 'PYQs',
      fileSize: 840000,
      mimeType: 'application/pdf',
      rawText: 'Midterm Examination 2024. Q1: Construct AVL tree for keys: 15, 20, 24, 10, 13, 7, 30. Q2: SQL join query optimizations.',
      extractedSummary: 'Past year exam paper for 2024 focusing heavily on AVL trees and SQL queries.',
      status: 'Processed',
      uploadedAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      metadata: { year: 2024, term: 'Fall' },
    },
    {
      id: 'doc_4',
      userId: user.id,
      courseId: 'c_dbms',
      name: 'Notice_Sep18.pdf',
      type: 'Notice',
      fileSize: 180000,
      mimeType: 'application/pdf',
      rawText: 'Department Notice: DBMS Quiz scheduled on September 23 at 10:00 AM. Topics: ER Modeling, SQL Joins, Normalization up to 3NF.',
      extractedSummary: 'Official exam schedule notice announcing upcoming DBMS Quiz on Sept 23.',
      status: 'Processed',
      uploadedAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      metadata: { deadlinesFound: ['DBMS Quiz: 2026-09-23'] },
    },
  ];

  // Topics
  const topics: Topic[] = [
    // Data Structures
    { id: 'top_ds_1', courseId: 'c_ds', parentTopicId: null, name: 'Arrays', orderIndex: 1, depth: 1, pyqFrequency: 'High', difficulty: 'Easy', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_2', courseId: 'c_ds', parentTopicId: null, name: 'Linked Lists', orderIndex: 2, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_3', courseId: 'c_ds', parentTopicId: null, name: 'Trees', orderIndex: 3, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_3_1', courseId: 'c_ds', parentTopicId: 'top_ds_3', name: 'Binary Trees', orderIndex: 1, depth: 2, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_3_2', courseId: 'c_ds', parentTopicId: 'top_ds_3', name: 'BST', orderIndex: 2, depth: 2, pyqFrequency: 'Medium', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_3_3', courseId: 'c_ds', parentTopicId: 'top_ds_3', name: 'AVL Trees', orderIndex: 3, depth: 2, pyqFrequency: 'High', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_ds_4', courseId: 'c_ds', parentTopicId: null, name: 'Graphs', orderIndex: 4, depth: 1, pyqFrequency: 'Medium', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },

    // Operating Systems
    { id: 'top_os_1', courseId: 'c_os', parentTopicId: null, name: 'Process Management', orderIndex: 1, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_os_2', courseId: 'c_os', parentTopicId: null, name: 'Memory Management', orderIndex: 2, depth: 1, pyqFrequency: 'High', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_os_3', courseId: 'c_os', parentTopicId: null, name: 'File Systems', orderIndex: 3, depth: 1, pyqFrequency: 'Medium', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_os_4', courseId: 'c_os', parentTopicId: null, name: 'Deadlocks', orderIndex: 4, depth: 1, pyqFrequency: 'High', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },

    // DBMS
    { id: 'top_db_1', courseId: 'c_dbms', parentTopicId: null, name: 'ER Modeling', orderIndex: 1, depth: 1, pyqFrequency: 'High', difficulty: 'Easy', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_db_2', courseId: 'c_dbms', parentTopicId: null, name: 'Normalization', orderIndex: 2, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_db_3', courseId: 'c_dbms', parentTopicId: null, name: 'SQL', orderIndex: 3, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_db_4', courseId: 'c_dbms', parentTopicId: null, name: 'Transactions', orderIndex: 4, depth: 1, pyqFrequency: 'High', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },

    // Computer Networks
    { id: 'top_cn_1', courseId: 'c_cn', parentTopicId: null, name: 'OSI Model', orderIndex: 1, depth: 1, pyqFrequency: 'High', difficulty: 'Easy', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_cn_2', courseId: 'c_cn', parentTopicId: null, name: 'TCP/IP', orderIndex: 2, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_cn_3', courseId: 'c_cn', parentTopicId: null, name: 'Routing', orderIndex: 3, depth: 1, pyqFrequency: 'Medium', difficulty: 'Hard', createdAt: nowIso, updatedAt: nowIso },

    // Discrete Mathematics
    { id: 'top_dm_1', courseId: 'c_dm', parentTopicId: null, name: 'Logic & Proofs', orderIndex: 1, depth: 1, pyqFrequency: 'Medium', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_dm_2', courseId: 'c_dm', parentTopicId: null, name: 'Graph Theory', orderIndex: 2, depth: 1, pyqFrequency: 'High', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
    { id: 'top_dm_3', courseId: 'c_dm', parentTopicId: null, name: 'Combinatorics', orderIndex: 3, depth: 1, pyqFrequency: 'Medium', difficulty: 'Medium', createdAt: nowIso, updatedAt: nowIso },
  ];

  // Topic Relationships
  const topicRelationships: TopicRelationship[] = [
    { id: 'rel_1', sourceTopicId: 'top_ds_2', targetTopicId: 'top_ds_3', relationshipType: 'prerequisite' },
    { id: 'rel_2', sourceTopicId: 'top_ds_3_2', targetTopicId: 'top_ds_3_3', relationshipType: 'builds_on' },
    { id: 'rel_3', sourceTopicId: 'top_db_1', targetTopicId: 'top_db_2', relationshipType: 'prerequisite' },
    { id: 'rel_4', sourceTopicId: 'top_cn_1', targetTopicId: 'top_cn_2', relationshipType: 'related' },
  ];

  // Coverage
  const coverages: Coverage[] = [
    { id: 'cov_1', userId: user.id, topicId: 'top_ds_1', score: 95, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_2', userId: user.id, topicId: 'top_ds_2', score: 88, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_3', userId: user.id, topicId: 'top_ds_3', score: 74, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_3_1', userId: user.id, topicId: 'top_ds_3_1', score: 85, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_3_2', userId: user.id, topicId: 'top_ds_3_2', score: 78, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_3_3', userId: user.id, topicId: 'top_ds_3_3', score: 42, status: 'weak', lastAssessedAt: nowIso },
    { id: 'cov_4', userId: user.id, topicId: 'top_ds_4', score: 55, status: 'moderate', lastAssessedAt: nowIso },

    { id: 'cov_os_1', userId: user.id, topicId: 'top_os_1', score: 78, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_os_2', userId: user.id, topicId: 'top_os_2', score: 55, status: 'moderate', lastAssessedAt: nowIso },
    { id: 'cov_os_3', userId: user.id, topicId: 'top_os_3', score: 48, status: 'weak', lastAssessedAt: nowIso },
    { id: 'cov_os_4', userId: user.id, topicId: 'top_os_4', score: 62, status: 'moderate', lastAssessedAt: nowIso },

    { id: 'cov_db_1', userId: user.id, topicId: 'top_db_1', score: 68, status: 'moderate', lastAssessedAt: nowIso },
    { id: 'cov_db_2', userId: user.id, topicId: 'top_db_2', score: 52, status: 'moderate', lastAssessedAt: nowIso },
    { id: 'cov_db_3', userId: user.id, topicId: 'top_db_3', score: 44, status: 'weak', lastAssessedAt: nowIso },
    { id: 'cov_db_4', userId: user.id, topicId: 'top_db_4', score: 22, status: 'weak', lastAssessedAt: nowIso },

    { id: 'cov_cn_1', userId: user.id, topicId: 'top_cn_1', score: 65, status: 'moderate', lastAssessedAt: nowIso },
    { id: 'cov_cn_2', userId: user.id, topicId: 'top_cn_2', score: 42, status: 'weak', lastAssessedAt: nowIso },
    { id: 'cov_cn_3', userId: user.id, topicId: 'top_cn_3', score: 28, status: 'weak', lastAssessedAt: nowIso },

    { id: 'cov_dm_1', userId: user.id, topicId: 'top_dm_1', score: 82, status: 'strong', lastAssessedAt: nowIso },
    { id: 'cov_dm_2', userId: user.id, topicId: 'top_dm_2', score: 68, status: 'moderate', lastAssessedAt: nowIso },
    { id: 'cov_dm_3', userId: user.id, topicId: 'top_dm_3', score: 65, status: 'moderate', lastAssessedAt: nowIso },
  ];

  // PYQs
  const pyqQuestions: PYQQuestion[] = [
    {
      id: 'pyq_1',
      courseId: 'c_ds',
      topicId: 'top_ds_3_3',
      documentId: 'doc_3',
      year: 2024,
      term: 'Fall',
      questionText: 'Explain the 4 rotation types in AVL Trees with suitable examples.',
      marks: 10,
      frequencyWeight: 5,
    },
    {
      id: 'pyq_2',
      courseId: 'c_dbms',
      topicId: 'top_db_2',
      year: 2024,
      term: 'Fall',
      questionText: 'Differentiate between 2NF, 3NF and BCNF with functional dependency examples.',
      marks: 8,
      frequencyWeight: 4,
    },
  ];

  // Deadlines
  const deadlines: Deadline[] = [
    {
      id: 'dl_1',
      userId: user.id,
      courseId: 'c_dbms',
      title: 'DBMS Quiz',
      description: 'Prepare: SQL Joins, Normalization',
      dueDate: new Date(now.getTime() + 3 * 86400000).toISOString(),
      type: 'Quiz',
      status: 'pending',
      createdAt: nowIso,
    },
    {
      id: 'dl_2',
      userId: user.id,
      courseId: 'c_os',
      title: 'Assignment 2',
      description: 'Submission deadline',
      dueDate: new Date(now.getTime() + 5 * 86400000).toISOString(),
      type: 'Assignment',
      status: 'pending',
      createdAt: nowIso,
    },
    {
      id: 'dl_3',
      userId: user.id,
      courseId: 'c_ds',
      title: 'Midterm Exam',
      description: 'Data Structures',
      dueDate: new Date(now.getTime() + 9 * 86400000).toISOString(),
      type: 'Exam',
      status: 'pending',
      createdAt: nowIso,
    },
  ];

  // Conflicts
  const conflicts: Conflict[] = [
    {
      id: 'conf_1',
      userId: user.id,
      deadlineId1: 'dl_1',
      deadlineId2: 'dl_2',
      severity: 'medium',
      description: 'Quiz and Assignment scheduled within 48 hours of each other.',
      resolved: false,
      createdAt: nowIso,
    },
  ];

  // Study Plan Items
  const studyPlanItems: StudyPlanItem[] = [
    {
      id: 'sp_1',
      userId: user.id,
      topicId: 'top_ds_3_3',
      title: 'Review AVL Trees',
      duration: '15 min',
      durationMinutes: 15,
      priority: 'High',
      type: 'Review',
      completed: false,
      orderIndex: 1,
      createdAt: nowIso,
    },
    {
      id: 'sp_2',
      userId: user.id,
      deadlineId: 'dl_1',
      title: 'DBMS Quiz',
      duration: 'In 3 days',
      durationMinutes: 60,
      dueDate: new Date(now.getTime() + 3 * 86400000).toISOString(),
      priority: 'High',
      type: 'Quiz',
      completed: false,
      orderIndex: 2,
      createdAt: nowIso,
    },
    {
      id: 'sp_3',
      userId: user.id,
      deadlineId: 'dl_2',
      title: 'Assignment 2',
      duration: 'In 5 days',
      durationMinutes: 90,
      dueDate: new Date(now.getTime() + 5 * 86400000).toISOString(),
      priority: 'Medium',
      type: 'Practice',
      completed: false,
      orderIndex: 3,
      createdAt: nowIso,
    },
    {
      id: 'sp_4',
      userId: user.id,
      deadlineId: 'dl_3',
      title: 'Midterm Exam',
      duration: 'In 9 days',
      durationMinutes: 120,
      dueDate: new Date(now.getTime() + 9 * 86400000).toISOString(),
      priority: 'High',
      type: 'Quiz',
      completed: false,
      orderIndex: 4,
      createdAt: nowIso,
    },
    {
      id: 'sp_5',
      userId: user.id,
      topicId: 'top_db_4',
      title: 'Read: Transactions & Concurrency',
      duration: '20 min',
      durationMinutes: 20,
      priority: 'Medium',
      type: 'Read',
      completed: false,
      orderIndex: 5,
      createdAt: nowIso,
    },
    {
      id: 'sp_6',
      userId: user.id,
      topicId: 'top_ds_4',
      title: 'Practice: Graph Algorithms',
      duration: '30 min',
      durationMinutes: 30,
      priority: 'Medium',
      type: 'Practice',
      completed: false,
      orderIndex: 6,
      createdAt: nowIso,
    },
  ];

  // Resources
  const resources: Resource[] = [
    { id: 'res_1', topicId: 'top_ds_3_3', courseId: 'c_ds', title: 'AVL Trees — Visual Guide', type: 'Video', subject: 'Data Structures', url: 'https://visualgo.net/en/bst', relevance: 'High' },
    { id: 'res_2', topicId: 'top_db_3', courseId: 'c_dbms', title: 'SQL Joins Explained', type: 'Article', subject: 'DBMS', url: '#', relevance: 'High' },
    { id: 'res_3', topicId: 'top_os_1', courseId: 'c_os', title: 'OS Process Scheduling Practice', type: 'Quiz', subject: 'Operating Systems', url: '#', relevance: 'Medium' },
    { id: 'res_4', topicId: 'top_dm_2', courseId: 'c_dm', title: 'Graph Theory Fundamentals', type: 'PDF', subject: 'Discrete Mathematics', url: '#', relevance: 'Medium' },
    { id: 'res_5', topicId: 'top_cn_2', courseId: 'c_cn', title: 'TCP/IP in 15 Minutes', type: 'Video', subject: 'Computer Networks', url: '#', relevance: 'High' },
    { id: 'res_6', topicId: 'top_db_2', courseId: 'c_dbms', title: 'Database Normalization 3NF', type: 'Article', subject: 'DBMS', url: '#', relevance: 'High' },
  ];

  // Tutor Conversation & Message
  const tutorConversations: TutorConversation[] = [
    {
      id: 'conv_default',
      userId: user.id,
      courseId: 'c_ds',
      title: 'Data Structures & DBMS Assistance',
      currentTopicId: 'top_ds_3_3',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const tutorMessages: TutorMessage[] = [
    {
      id: 'msg_welcome',
      conversationId: 'conv_default',
      role: 'assistant',
      content: "Hello! I'm your Lucent Tutor. I've analyzed your uploaded materials — your Data Structures notes, 2024 PYQs, and course syllabus. What would you like to explore today?",
      sources: ['Unit 3 Notes', 'DS_Syllabus.pdf'],
      suggestedQuestions: [
        'Explain AVL tree rotations',
        'What topics from PYQ 2024 do I need to review?',
        'How is normalization tested in DBMS?',
      ],
      timestamp: new Date(now.getTime() - 60000).toISOString(),
    },
  ];

  return {
    users: [user],
    courses,
    documents,
    topics,
    topicRelationships,
    coverages,
    pyqQuestions,
    deadlines,
    conflicts,
    studyPlanItems,
    resources,
    tutorConversations,
    tutorMessages,
  };
}

class Database {
  private cache: DatabaseSchema | null = null;
  private writeLock: Promise<void> = Promise.resolve();

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public read(): DatabaseSchema {
    if (this.cache) return this.cache;

    this.ensureDirectory();
    if (!fs.existsSync(DB_FILE)) {
      const seed = getInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      this.cache = seed;
      return seed;
    }

    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      this.cache = parsed;
      return parsed;
    } catch {
      const seed = getInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      this.cache = seed;
      return seed;
    }
  }

  public async write(data: DatabaseSchema): Promise<void> {
    this.cache = data;
    this.ensureDirectory();
    // Atomic file write
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
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
}

export const db = new Database();
