// src/lib/supabase/database.ts
// High-level Supabase database service for Lucent entities
import { getSupabaseServerClient, isSupabaseServerConfigured } from './server';
import {
  User,
  Course,
  Document,
  Topic,
  Deadline,
  TutorMessage,
} from '../models/types';
import { AdaptationDetails } from '@/services/adaptation-service';
import { FeedbackRecord, StoredPlanState } from '@/services/plan-store';

export const supabaseDb = {
  isAvailable(): boolean {
    return isSupabaseServerConfigured();
  },

  // 1. User Profile
  async getUser(): Promise<User | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      avatar: data.avatar || 'S',
      examDate: data.exam_date || '',
      dailyStudyGoalMinutes: data.daily_study_goal_minutes || 180,
      deadlineReminders: data.deadline_reminders ?? true,
      coverageAlerts: data.coverage_alerts ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateUser(updates: Partial<User>): Promise<User | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.examDate !== undefined) payload.exam_date = updates.examDate;
    if (updates.dailyStudyGoalMinutes !== undefined) payload.daily_study_goal_minutes = updates.dailyStudyGoalMinutes;
    if (updates.deadlineReminders !== undefined) payload.deadline_reminders = updates.deadlineReminders;
    if (updates.coverageAlerts !== undefined) payload.coverage_alerts = updates.coverageAlerts;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: updates.id || 'user_1', ...payload })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      avatar: data.avatar || 'S',
      examDate: data.exam_date || '',
      dailyStudyGoalMinutes: data.daily_study_goal_minutes || 180,
      deadlineReminders: data.deadline_reminders,
      coverageAlerts: data.coverage_alerts,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // 2. Courses
  async getCourses(): Promise<Course[] | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;

    return data.map((c) => ({
      id: c.id,
      userId: c.user_id || 'user_1',
      name: c.name,
      code: c.code || '',
      term: c.term || 'Autumn 2026',
      description: c.description || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  },

  async createCourse(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const id = `c_${Date.now()}`;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('courses')
      .insert({
        id,
        user_id: course.userId || 'user_1',
        name: course.name,
        code: course.code || '',
        term: course.term || 'Autumn 2026',
        description: course.description || '',
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id || 'user_1',
      name: data.name,
      code: data.code,
      term: data.term,
      description: data.description,
      createdAt: data.created_at || now,
      updatedAt: data.updated_at || now,
    };
  },

  // 3. Documents
  async getDocuments(): Promise<Document[] | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from('documents').select('*').order('upload_date', { ascending: false });
    if (error || !data) return null;

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id || 'user_1',
      courseId: d.course_id || 'course_default',
      name: d.name,
      type: d.type || 'Other',
      fileSize: typeof d.size === 'number' ? d.size : 0,
      mimeType: d.mime_type || 'application/octet-stream',
      rawText: d.raw_text,
      extractedSummary: d.extracted_summary,
      status: (d.status || 'Processed') as Document['status'],
      uploadedAt: d.upload_date || d.created_at || new Date().toISOString(),
    }));
  },

  async createDocument(doc: Document): Promise<Document | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { error } = await supabase
      .from('documents')
      .insert({
        id: doc.id,
        user_id: doc.userId,
        course_id: doc.courseId,
        name: doc.name,
        type: doc.type,
        size: doc.fileSize,
        mime_type: doc.mimeType,
        status: doc.status,
        upload_date: doc.uploadedAt,
        raw_text: doc.rawText,
        extracted_summary: doc.extractedSummary,
      });

    if (error) return null;
    return doc;
  },

  // 4. Topics
  async getTopics(): Promise<Topic[] | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from('topics').select('*');
    if (error || !data) return null;

    return data.map((t, idx) => ({
      id: t.id,
      courseId: t.course_id || 'course_default',
      parentTopicId: t.parent_topic_id || null,
      name: t.name,
      description: t.description || '',
      orderIndex: t.order_index ?? idx,
      depth: t.depth ?? 0,
      pyqFrequency: (t.importance === 'High' ? 'High' : t.importance === 'Low' ? 'Low' : 'Medium'),
      difficulty: 'Medium',
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: t.updated_at || new Date().toISOString(),
    }));
  },

  // 5. Deadlines
  async getDeadlines(): Promise<Deadline[] | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase.from('deadlines').select('*').order('date', { ascending: true });
    if (error || !data) return null;

    return data.map((d) => ({
      id: d.id,
      userId: d.user_id || 'user_1',
      title: d.title,
      description: d.description || d.title,
      dueDate: d.date || new Date().toISOString(),
      date: d.date,
      type: (d.urgency === 'High' ? 'Exam' : 'Assignment') as Deadline['type'],
      status: 'pending',
      createdAt: d.created_at || new Date().toISOString(),
    }));
  },

  // 6. Active Study Plan
  async getActivePlan(): Promise<StoredPlanState | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', 'active_plan')
      .maybeSingle();

    if (error || !data || !data.days || data.days.length === 0) return null;

    return {
      plan: {
        summary: data.summary,
        days: data.days,
      },
      lastAdaptation: data.adaptation as AdaptationDetails | undefined,
      completedSessionKeys: Object.keys(data.completed_sessions || {}),
      feedbackLog: (data.feedback_log || []) as FeedbackRecord[],
      updatedAt: data.updated_at,
    };
  },

  async saveActivePlan(state: StoredPlanState): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return false;

    const completedMap: Record<string, boolean> = {};
    (state.completedSessionKeys || []).forEach((k) => {
      completedMap[k] = true;
    });

    const { error } = await supabase.from('study_plans').upsert({
      id: 'active_plan',
      summary: state.plan.summary,
      days: state.plan.days,
      adaptation: state.lastAdaptation || null,
      completed_sessions: completedMap,
      feedback_log: state.feedbackLog || [],
      updated_at: new Date().toISOString(),
    });

    return !error;
  },

  // 7. Tutor Messages
  async getTutorMessages(conversationId?: string): Promise<TutorMessage[] | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const convId = conversationId || 'conv_default';
    const { data, error } = await supabase
      .from('tutor_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error || !data) return null;

    return data.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      sources: m.sources || [],
      timestamp: m.created_at,
    }));
  },

  async addTutorMessage(msg: Omit<TutorMessage, 'id' | 'timestamp'> & { sources?: string[] }): Promise<TutorMessage | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    const convId = msg.conversationId || 'conv_default';

    // Ensure conversation exists
    await supabase.from('tutor_conversations').upsert({
      id: convId,
      title: 'Study Session',
      updated_at: new Date().toISOString(),
    });

    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('tutor_messages')
      .insert({
        id,
        conversation_id: convId,
        role: msg.role,
        content: msg.content,
        sources: msg.sources || [],
        created_at: now,
      })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      sources: data.sources || [],
      timestamp: data.created_at,
    };
  },
};
