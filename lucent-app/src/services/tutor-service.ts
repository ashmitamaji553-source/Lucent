// src/services/tutor-service.ts
// AI Tutor service with Gemini API integration, document RAG, and Supabase persistence
import { tutorRepo, documentRepo, topicRepo, pyqRepo } from '../lib/db/repositories';
import { TutorMessage } from '../lib/models/types';
import { aiService } from './ai-service';
import { geminiService } from './gemini-service';
import { supabaseDb } from '@/lib/supabase/database';

export interface TutorResponse {
  message: TutorMessage;
  contextSources: string[];
  suggestedQuestions: string[];
  modelUsed?: string;
}

export class TutorService {
  /**
   * Retrieves full chat history for the active conversation.
   */
  public async getConversationHistoryAsync(conversationId?: string): Promise<{ conversation: ReturnType<typeof tutorRepo.getDefaultConversation>; messages: TutorMessage[] }> {
    const conv = tutorRepo.getDefaultConversation();
    const activeId = conversationId || conv.id;

    if (supabaseDb.isAvailable()) {
      try {
        const sbMessages = await supabaseDb.getTutorMessages(activeId);
        if (sbMessages && sbMessages.length > 0) {
          return { conversation: conv, messages: sbMessages };
        }
      } catch (err) {
        console.warn('Could not read tutor messages from Supabase, falling back to local store:', err);
      }
    }

    const messages = tutorRepo.getMessages(activeId);
    return { conversation: conv, messages };
  }

  public getConversationHistory(conversationId?: string): { conversation: ReturnType<typeof tutorRepo.getDefaultConversation>; messages: TutorMessage[] } {
    const conv = tutorRepo.getDefaultConversation();
    const messages = tutorRepo.getMessages(conversationId || conv.id);
    return { conversation: conv, messages };
  }

  /**
   * Processes a user question, retrieves relevant context chunks, and generates a grounded response.
   */
  public async askTutor(userQuestion: string, conversationId?: string): Promise<TutorResponse> {
    const conv = tutorRepo.getDefaultConversation();
    const activeConvId = conversationId || conv.id;

    // 1. Record user message locally and to Supabase
    await tutorRepo.addMessage({
      conversationId: activeConvId,
      role: 'user',
      content: userQuestion,
    });

    if (supabaseDb.isAvailable()) {
      supabaseDb.addTutorMessage({
        conversationId: activeConvId,
        role: 'user',
        content: userQuestion,
      }).catch((e) => console.warn('Supabase tutor message save error:', e));
    }

    // 2. RAG Context Retrieval: Gather relevant documents, topics, and PYQs
    let documents = documentRepo.getAll();
    let topics = topicRepo.getAll();
    const pyqs = pyqRepo.getAll();

    if (supabaseDb.isAvailable()) {
      try {
        const [sbDocs, sbTopics] = await Promise.all([
          supabaseDb.getDocuments(),
          supabaseDb.getTopics(),
        ]);
        if (sbDocs && sbDocs.length > 0) documents = sbDocs;
        if (sbTopics && sbTopics.length > 0) topics = sbTopics;
      } catch (e) {
        console.warn('Supabase RAG fetch warning:', e);
      }
    }

    const qLower = userQuestion.toLowerCase();

    // Find related topics
    const relatedTopic = topics.find((t) => qLower.includes(t.name.toLowerCase()));
    if (relatedTopic) {
      await tutorRepo.updateCurrentTopic(activeConvId, relatedTopic.id);
    }

    // 3. Attempt Gemini API Generation
    if (geminiService.isAvailable()) {
      const existingHistory = tutorRepo.getMessages(activeConvId);
      const geminiResult = await geminiService.generateTutorResponse({
        question: userQuestion,
        conversationHistory: existingHistory,
        documents,
        topics,
        pyqs,
      });

      if (geminiResult) {
        const assistantMsg = await tutorRepo.addMessage({
          conversationId: activeConvId,
          role: 'assistant',
          content: geminiResult.reply,
          sources: geminiResult.sources,
          suggestedQuestions: geminiResult.suggestedQuestions,
        });

        if (supabaseDb.isAvailable()) {
          supabaseDb.addTutorMessage({
            conversationId: activeConvId,
            role: 'assistant',
            content: geminiResult.reply,
            sources: geminiResult.sources,
          }).catch((e) => console.warn('Supabase assistant message save error:', e));
        }

        return {
          message: assistantMsg,
          contextSources: geminiResult.sources,
          suggestedQuestions: geminiResult.suggestedQuestions,
          modelUsed: geminiResult.modelUsed,
        };
      }
    }

    // 4. Fallback Heuristic / General AI engine
    const matchingDocs = documents.filter((d) => {
      const nameMatch = d.name.toLowerCase().split(/\W+/).some((w) => w.length > 2 && qLower.includes(w));
      const textMatch = d.rawText && d.rawText.toLowerCase().split(/\W+/).some((w) => w.length > 3 && qLower.includes(w));
      return nameMatch || textMatch;
    });

    const contextDocs = matchingDocs.length > 0 ? matchingDocs : documents.slice(0, 3);
    const sources = contextDocs.map((d) => d.name);
    const matchingPyqs = pyqs.filter((p) => qLower.includes(p.questionText.toLowerCase().slice(0, 15)));

    const systemPrompt = `
You are the Lucent Academic Tutor.
Your goal is to bring clarity to complex academic topics.
Ground your answers firmly in the student's uploaded materials and curriculum.
Be encouraging, concise, and structured. Always highlight practical exam insights or common pitfalls.
`;

    const contextSnippet = contextDocs
      .map((d) => `[Source: ${d.name} (${d.type})]\n${d.rawText || d.extractedSummary || 'Content available'}`)
      .join('\n\n');

    const pyqSnippet = matchingPyqs.length > 0
      ? `\nRelevant Past Exam Questions:\n` + matchingPyqs.map((p) => `- (${p.year}) ${p.questionText}`).join('\n')
      : '';

    const fullPrompt = `
Context Materials:
${contextSnippet}
${pyqSnippet}

Student Question:
"${userQuestion}"

Provide a clear, pedagogical response grounded in the above materials. If citing an exam or unit, mention the source name.
`;

    const replyText = await aiService.generateText(fullPrompt, systemPrompt);
    const suggestions = this.deriveSuggestions(userQuestion, relatedTopic?.name);

    const assistantMsg = await tutorRepo.addMessage({
      conversationId: activeConvId,
      role: 'assistant',
      content: replyText,
      sources,
      suggestedQuestions: suggestions,
    });

    if (supabaseDb.isAvailable()) {
      supabaseDb.addTutorMessage({
        conversationId: activeConvId,
        role: 'assistant',
        content: replyText,
        sources,
      }).catch((e) => console.warn('Supabase fallback message save error:', e));
    }

    return {
      message: assistantMsg,
      contextSources: sources,
      suggestedQuestions: suggestions,
      modelUsed: 'heuristic-engine',
    };
  }

  private deriveSuggestions(question: string, topicName?: string): string[] {
    const qLower = question.toLowerCase();
    if (qLower.includes('tree') || qLower.includes('avl') || topicName?.toLowerCase().includes('tree')) {
      return [
        'How do I detect which rotation is needed?',
        'Show an example of an LR double rotation',
        'What was asked about AVL trees in PYQ 2024?',
      ];
    }
    if (qLower.includes('sql') || qLower.includes('normalization') || qLower.includes('dbms')) {
      return [
        'How do I test if a relation is in BCNF?',
        'Explain SQL Joins with an example',
        'What are the key topics for the upcoming DBMS quiz?',
      ];
    }
    return [
      'Explain the key differences and trade-offs',
      'What past year questions focus on this?',
      'How does this relate to upcoming deadlines?',
    ];
  }
}

export const tutorService = new TutorService();
