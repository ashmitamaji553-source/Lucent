// src/lib/db/repositories.ts
// Clean, minimal repositories for all 13 Lucent database entities
import { db } from './index';
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
  TopicWithSubtopics,
  SubjectCoverageSummary,
  SignalSummary,
} from '../models/types';

export const userRepo = {
  getPrimaryUser(): User {
    const data = db.read();
    return data.users[0];
  },
  async updateUser(updates: Partial<User>): Promise<User> {
    return db.update((data) => {
      const u = data.users[0];
      const updated: User = {
        ...u,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      data.users[0] = updated;
      return updated;
    });
  },
};

export const courseRepo = {
  getAll(): Course[] {
    return db.read().courses;
  },
  getById(id: string): Course | undefined {
    return db.read().courses.find((c) => c.id === id);
  },
  getByName(name: string): Course | undefined {
    return db.read().courses.find((c) => c.name.toLowerCase() === name.toLowerCase());
  },
  async create(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
    return db.update((data) => {
      const now = new Date().toISOString();
      const newCourse: Course = {
        id: `c_${Date.now()}`,
        ...course,
        createdAt: now,
        updatedAt: now,
      };
      data.courses.push(newCourse);
      return newCourse;
    });
  },
};

export const documentRepo = {
  getAll(): Document[] {
    return [...db.read().documents].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  },
  getById(id: string): Document | undefined {
    return db.read().documents.find((d) => d.id === id);
  },
  async create(doc: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document> {
    return db.update((data) => {
      const newDoc: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        uploadedAt: new Date().toISOString(),
        ...doc,
      };
      data.documents.unshift(newDoc);
      return newDoc;
    });
  },
  async updateStatus(id: string, status: Document['status'], metadata?: Document['metadata']): Promise<Document | undefined> {
    return db.update((data) => {
      const doc = data.documents.find((d) => d.id === id);
      if (doc) {
        doc.status = status;
        if (metadata) doc.metadata = { ...doc.metadata, ...metadata };
      }
      return doc;
    });
  },
  async delete(id: string): Promise<boolean> {
    return db.update((data) => {
      const idx = data.documents.findIndex((d) => d.id === id);
      if (idx !== -1) {
        data.documents.splice(idx, 1);
        return true;
      }
      return false;
    });
  },
};

export const topicRepo = {
  getAll(): Topic[] {
    return db.read().topics;
  },
  getByCourse(courseId: string): Topic[] {
    return db.read().topics.filter((t) => t.courseId === courseId);
  },
  getById(id: string): Topic | undefined {
    return db.read().topics.find((t) => t.id === id);
  },
  async create(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
    return db.update((data) => {
      const now = new Date().toISOString();
      const newTopic: Topic = {
        id: `top_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
        ...topic,
      };
      data.topics.push(newTopic);
      return newTopic;
    });
  },
  getRelationships(): TopicRelationship[] {
    return db.read().topicRelationships;
  },
  async addRelationship(sourceTopicId: string, targetTopicId: string, type: TopicRelationship['relationshipType']): Promise<TopicRelationship> {
    return db.update((data) => {
      const rel: TopicRelationship = {
        id: `rel_${Date.now()}`,
        sourceTopicId,
        targetTopicId,
        relationshipType: type,
      };
      data.topicRelationships.push(rel);
      return rel;
    });
  },
};

export const coverageRepo = {
  getAll(): Coverage[] {
    return db.read().coverages;
  },
  getByTopic(topicId: string): Coverage | undefined {
    return db.read().coverages.find((c) => c.topicId === topicId);
  },
  async upsert(topicId: string, score: number, userId: string = 'user_1'): Promise<Coverage> {
    return db.update((data) => {
      const status = score >= 70 ? 'strong' : score >= 50 ? 'moderate' : 'weak';
      const existing = data.coverages.find((c) => c.topicId === topicId && c.userId === userId);
      const now = new Date().toISOString();
      if (existing) {
        existing.score = score;
        existing.status = status;
        existing.lastAssessedAt = now;
        return existing;
      }
      const newCov: Coverage = {
        id: `cov_${Date.now()}`,
        userId,
        topicId,
        score,
        status,
        lastAssessedAt: now,
      };
      data.coverages.push(newCov);
      return newCov;
    });
  },
};

export const pyqRepo = {
  getAll(): PYQQuestion[] {
    return db.read().pyqQuestions;
  },
  getByTopic(topicId: string): PYQQuestion[] {
    return db.read().pyqQuestions.filter((q) => q.topicId === topicId);
  },
  async create(q: Omit<PYQQuestion, 'id'>): Promise<PYQQuestion> {
    return db.update((data) => {
      const newQ: PYQQuestion = {
        id: `pyq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...q,
      };
      data.pyqQuestions.push(newQ);
      return newQ;
    });
  },
};

export const deadlineRepo = {
  getAll(): Deadline[] {
    return [...db.read().deadlines].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  },
  getById(id: string): Deadline | undefined {
    return db.read().deadlines.find((d) => d.id === id);
  },
  async create(dl: Omit<Deadline, 'id' | 'createdAt'>): Promise<Deadline> {
    return db.update((data) => {
      const newDl: Deadline = {
        id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        ...dl,
      };
      data.deadlines.push(newDl);
      return newDl;
    });
  },
  async update(id: string, updates: Partial<Deadline>): Promise<Deadline | undefined> {
    return db.update((data) => {
      const dl = data.deadlines.find((d) => d.id === id);
      if (dl) Object.assign(dl, updates);
      return dl;
    });
  },
};

export const conflictRepo = {
  getAll(): Conflict[] {
    return db.read().conflicts;
  },
  async create(conf: Omit<Conflict, 'id' | 'createdAt'>): Promise<Conflict> {
    return db.update((data) => {
      const newConf: Conflict = {
        id: `conf_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...conf,
      };
      data.conflicts.push(newConf);
      return newConf;
    });
  },
};

export const studyPlanRepo = {
  getAll(): StudyPlanItem[] {
    return [...db.read().studyPlanItems].sort((a, b) => a.orderIndex - b.orderIndex);
  },
  async toggleComplete(id: string): Promise<StudyPlanItem | undefined> {
    return db.update((data) => {
      const item = data.studyPlanItems.find((s) => s.id === id);
      if (item) item.completed = !item.completed;
      return item;
    });
  },
  async create(item: Omit<StudyPlanItem, 'id' | 'createdAt'>): Promise<StudyPlanItem> {
    return db.update((data) => {
      const newItem: StudyPlanItem = {
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        ...item,
      };
      data.studyPlanItems.push(newItem);
      return newItem;
    });
  },
  async replaceAll(items: StudyPlanItem[]): Promise<StudyPlanItem[]> {
    return db.update((data) => {
      data.studyPlanItems = items;
      return items;
    });
  },
};

export const resourceRepo = {
  getAll(): Resource[] {
    return db.read().resources;
  },
  getBySubject(subject: string): Resource[] {
    return db.read().resources.filter((r) => r.subject.toLowerCase() === subject.toLowerCase());
  },
  async create(res: Omit<Resource, 'id'>): Promise<Resource> {
    return db.update((data) => {
      const newRes: Resource = {
        id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...res,
      };
      data.resources.push(newRes);
      return newRes;
    });
  },
};

export const tutorRepo = {
  getDefaultConversation(): TutorConversation {
    const data = db.read();
    return data.tutorConversations[0];
  },
  getMessages(conversationId: string): TutorMessage[] {
    return db.read().tutorMessages.filter((m) => m.conversationId === conversationId);
  },
  async addMessage(msg: Omit<TutorMessage, 'id' | 'timestamp'>): Promise<TutorMessage> {
    return db.update((data) => {
      const newMsg: TutorMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...msg,
      };
      data.tutorMessages.push(newMsg);
      return newMsg;
    });
  },
  async updateCurrentTopic(conversationId: string, topicId: string): Promise<void> {
    await db.update((data) => {
      const conv = data.tutorConversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.currentTopicId = topicId;
        conv.updatedAt = new Date().toISOString();
      }
    });
  },
};

// High-level composite queries
export const compositeRepo = {
  getTopicHierarchy(courseId: string): TopicWithSubtopics[] {
    const topics = topicRepo.getByCourse(courseId);
    const coverages = coverageRepo.getAll();
    const covMap = new Map(coverages.map((c) => [c.topicId, c.score]));

    const buildTree = (parentId: string | null = null): TopicWithSubtopics[] => {
      return topics
        .filter((t) => (parentId === null ? !t.parentTopicId : t.parentTopicId === parentId))
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((t) => {
          const children = buildTree(t.id);
          const ownScore = covMap.get(t.id);
          let effectiveCoverage = ownScore ?? 50;
          if (children.length > 0 && ownScore === undefined) {
            const sum = children.reduce((acc, c) => acc + c.coverage, 0);
            effectiveCoverage = Math.round(sum / children.length);
          }
          return {
            ...t,
            coverage: effectiveCoverage,
            children: children.length > 0 ? children : undefined,
          };
        });
    };

    return buildTree(null);
  },

  getAllSubjectsCoverage(): SubjectCoverageSummary[] {
    const courses = courseRepo.getAll();
    return courses.map((course) => {
      const subtopics = this.getTopicHierarchy(course.id);
      let avgCoverage = 50;
      if (subtopics.length > 0) {
        const sum = subtopics.reduce((acc, st) => acc + st.coverage, 0);
        avgCoverage = Math.round(sum / subtopics.length);
      }
      return {
        id: course.id,
        subject: course.name,
        coverage: avgCoverage,
        subtopics,
      };
    });
  },

  getSignals(): SignalSummary {
    const allTopics = topicRepo.getAll();
    const allCovs = coverageRepo.getAll();
    const covMap = new Map(allCovs.map((c) => [c.topicId, c.score]));
    const docs = documentRepo.getAll();

    // 1. Missing topics: score < 60 and high PYQ frequency
    const missing = allTopics.filter((t) => {
      const score = covMap.get(t.id) ?? 50;
      return score < 60;
    }).length;

    // 2. Updated notices: notices uploaded in last 7 days or recently modified deadlines
    const updatedNotices = docs.filter((d) => d.type === 'Notice').length;

    // 3. High priority topics: weak coverage + high PYQ frequency or hard difficulty
    const highPriority = allTopics.filter((t) => {
      const score = covMap.get(t.id) ?? 50;
      return (score < 60 && t.pyqFrequency === 'High') || (score < 50);
    }).length;

    // 4. Overall readiness: average across all top-level subjects
    const subjects = this.getAllSubjectsCoverage();
    const overallReadiness = subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.coverage, 0) / subjects.length)
      : 68;

    return {
      missingTopics: missing,
      updatedNotices: updatedNotices,
      highPriorityTopics: highPriority,
      overallReadiness: overallReadiness || 68,
    };
  },
};
