// src/services/tutor-service.ts
// AI Tutor service with document RAG and context-grounded citations
import { tutorRepo, documentRepo, topicRepo, pyqRepo } from '../lib/db/repositories';
import { TutorMessage } from '../lib/models/types';
import { aiService } from './ai-service';

export interface TutorResponse {
  message: TutorMessage;
  contextSources: string[];
  suggestedQuestions: string[];
}

export class TutorService {
  /**
   * Retrieves full chat history for the active conversation.
   */
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

    // 1. Record user message
    await tutorRepo.addMessage({
      conversationId: activeConvId,
      role: 'user',
      content: userQuestion,
    });

    // 2. RAG Context Retrieval: Gather relevant documents, topics, and PYQs
    const documents = documentRepo.getAll();
    const topics = topicRepo.getAll();
    const pyqs = pyqRepo.getAll();

    const qLower = userQuestion.toLowerCase();

    // Find documents matching query
    const matchingDocs = documents.filter((d) => {
      const nameMatch = d.name.toLowerCase().split(/\W+/).some((w) => w.length > 2 && qLower.includes(w));
      const textMatch = d.rawText && d.rawText.toLowerCase().split(/\W+/).some((w) => w.length > 3 && qLower.includes(w));
      return nameMatch || textMatch;
    });

    const contextDocs = matchingDocs.length > 0 ? matchingDocs : documents.slice(0, 3);
    const sources = contextDocs.map((d) => d.name);

    // Find related topics
    const relatedTopic = topics.find((t) => qLower.includes(t.name.toLowerCase()));
    if (relatedTopic) {
      await tutorRepo.updateCurrentTopic(activeConvId, relatedTopic.id);
    }

    // Related PYQ questions
    const matchingPyqs = pyqs.filter((p) => qLower.includes(p.questionText.toLowerCase().slice(0, 15)));

    // 3. Construct System & User Prompt for RAG
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

    // 4. Generate answer
    const replyText = await aiService.generateText(fullPrompt, systemPrompt);

    // 5. Generate contextual suggested follow-ups
    const suggestions = this.deriveSuggestions(userQuestion, relatedTopic?.name);

    // 6. Save assistant message
    const assistantMsg = await tutorRepo.addMessage({
      conversationId: activeConvId,
      role: 'assistant',
      content: replyText,
      sources,
      suggestedQuestions: suggestions,
    });

    return {
      message: assistantMsg,
      contextSources: sources,
      suggestedQuestions: suggestions,
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
