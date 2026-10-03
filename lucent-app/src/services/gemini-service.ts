// src/services/gemini-service.ts
// Official Google Gen AI SDK integration for the Lucent AI Tutor
import { GoogleGenAI } from '@google/genai';
import { Document, Topic, PYQQuestion, TutorMessage } from '@/lib/models/types';

export interface TutorContext {
  question: string;
  conversationHistory?: TutorMessage[];
  documents?: Document[];
  topics?: Topic[];
  pyqs?: PYQQuestion[];
}

export interface GeminiTutorResult {
  reply: string;
  sources: string[];
  suggestedQuestions: string[];
  modelUsed: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    this.defaultModel = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-flash-latest';

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client:', err);
      }
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  /**
   * Generates a pedagogical response for the student using Gemini
   */
  public async generateTutorResponse(context: TutorContext): Promise<GeminiTutorResult | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }

    const { question, conversationHistory = [], documents = [], topics = [], pyqs = [] } = context;

    // 1. Gather context snippets
    const qLower = question.toLowerCase();
    const relevantDocs = documents.filter((d) => {
      const nameMatch = d.name.toLowerCase().split(/\W+/).some((w) => w.length > 2 && qLower.includes(w));
      const textMatch = d.rawText && d.rawText.toLowerCase().split(/\W+/).some((w) => w.length > 3 && qLower.includes(w));
      return nameMatch || textMatch;
    });

    const activeDocs = relevantDocs.length > 0 ? relevantDocs.slice(0, 3) : documents.slice(0, 2);
    const sources = activeDocs.map((d) => d.name);

    const docContext = activeDocs
      .map((d) => `[Source Document: ${d.name} (${d.type})]\n${d.rawText ? d.rawText.slice(0, 2000) : d.extractedSummary || 'Content available'}`)
      .join('\n\n');

    const relevantPyqs = pyqs.filter((p) => qLower.includes(p.questionText.toLowerCase().slice(0, 15)));
    const pyqContext = relevantPyqs.length > 0
      ? `\nPast Exam Questions Reference:\n` + relevantPyqs.map((p) => `- (${p.year}) ${p.questionText}`).join('\n')
      : '';

    const relevantTopics = topics.filter((t) => qLower.includes(t.name.toLowerCase()));
    const topicContext = relevantTopics.length > 0
      ? `\nCurriculum Context Topics: ${relevantTopics.map((t) => t.name).join(', ')}`
      : '';

    // 2. Build system instructions
    const systemInstruction = `
You are the Lucent AI Academic Tutor — an encouraging, highly articulate, and precise university-level learning companion.
Your mission: Bring the hidden to light. Demystify complex concepts with rigorous accuracy while remaining approachable.

Guidelines:
1. Ground your explanations directly in the student's uploaded materials and curriculum where available.
2. Structure your answers with clear headings, bullet points, or numbered steps when breaking down multi-part concepts.
3. Call out practical exam insights, key definitions, and common student pitfalls.
4. If formulas, algorithms, or code are involved, explain each variable or line clearly.
5. Keep your tone supportive, academic, concise, and focused. Avoid unnecessary filler or overly casual language.
6. At the end of your response, provide 2 to 3 concise, natural follow-up questions the student might want to explore next, formatted as:
---SUGGESTIONS---
- Suggested question 1
- Suggested question 2
- Suggested question 3
`;

    // 3. Assemble chat context
    let promptText = '';
    if (docContext || pyqContext || topicContext) {
      promptText += `=== STUDENT'S ACADEMIC MATERIALS & CONTEXT ===\n${docContext}${topicContext}${pyqContext}\n\n`;
    }

    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-4);
      promptText += `=== RECENT CONVERSATION HISTORY ===\n`;
      recentHistory.forEach((msg) => {
        promptText += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
      promptText += '\n';
    }

    promptText += `STUDENT'S CURRENT QUESTION:\n"${question}"\n\nPlease provide a clear, grounded pedagogical answer.`;

    try {
      const response = await this.client.models.generateContent({
        model: this.defaultModel,
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const rawText = response.text || '';
      
      // Parse suggestions if generated
      const parts = rawText.split('---SUGGESTIONS---');
      const reply = parts[0].trim();
      let suggestedQuestions: string[] = [];

      if (parts[1]) {
        suggestedQuestions = parts[1]
          .split('\n')
          .map((line) => line.replace(/^[-*•\d.]\s*/, '').trim())
          .filter((line) => line.length > 5);
      }

      if (suggestedQuestions.length === 0) {
        suggestedQuestions = [
          `Can you walk through an example of this?`,
          `What are the most common exam questions on this topic?`,
          `How does this connect to earlier curriculum concepts?`,
        ];
      }

      return {
        reply,
        sources,
        suggestedQuestions: suggestedQuestions.slice(0, 3),
        modelUsed: this.defaultModel,
      };
    } catch (error: unknown) {
      console.error('Gemini generateContent error:', error);
      // Attempt fallback model chain
      const fallbackModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      for (const fbModel of fallbackModels) {
        if (fbModel === this.defaultModel) continue;
        try {
          const fallbackRes = await this.client.models.generateContent({
            model: fbModel,
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          const rawFallback = fallbackRes.text || '';
          if (rawFallback) {
            return {
              reply: rawFallback.split('---SUGGESTIONS---')[0].trim(),
              sources,
              suggestedQuestions: [
                `Can you walk through an example of this?`,
                `What are the most common exam questions on this topic?`,
                `How does this connect to earlier curriculum concepts?`,
              ],
              modelUsed: fbModel,
            };
          }
        } catch (fbErr) {
          console.warn(`Fallback ${fbModel} error:`, fbErr);
        }
      }
      return null;
    }
  }
}

export const geminiService = new GeminiService();
