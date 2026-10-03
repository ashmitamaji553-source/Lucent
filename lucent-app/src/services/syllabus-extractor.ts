// src/services/syllabus-extractor.ts
// Extracts units, topics, subtopics, learning objectives, and terminology to build the Topic Tree

import { Course, Topic } from '../lib/models/types';
import { courseRepo, topicRepo, coverageRepo } from '../lib/db/repositories';
import { aiService } from './ai-service';

export interface ExtractedTopicNode {
  name: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  subtopics?: ExtractedTopicNode[];
}

export interface ExtractedUnit {
  unitName: string;
  topics: ExtractedTopicNode[];
}

export interface SyllabusExtractionData {
  courseName: string;
  courseCode?: string;
  units: ExtractedUnit[];
  learningObjectives: string[];
  importantTerminology: string[];
}

export class SyllabusExtractor {
  /**
   * Extracts structured syllabus data and persists the complete Topic Tree.
   */
  public async extractAndStore(
    rawText: string,
    filename: string,
    docId: string
  ): Promise<{
    course: Course;
    topicCount: number;
    unitsCount: number;
    learningObjectives: string[];
    importantTerminology: string[];
    feedback: string[];
  }> {
    let data: SyllabusExtractionData | null = null;

    if (aiService.isConfigured()) {
      try {
        const prompt = `
Analyze this syllabus and extract the complete academic curriculum hierarchy in JSON format.
Document content:
"""
${rawText.slice(0, 4500)}
"""

Extract:
1. courseName: Official subject or course name (e.g., "Data Structures", "Operating Systems", "DBMS")
2. courseCode: Course code if available (e.g., "CS201")
3. units: Array of units, each having unitName and topics. Each topic should have name, difficulty ("Easy"|"Medium"|"Hard"), and optional subtopics (array of { name, subtopics }).
4. learningObjectives: Array of core learning objectives or outcomes
5. importantTerminology: Array of key academic terms / keywords

Output strictly in JSON schema:
{
  "courseName": "string",
  "courseCode": "string",
  "units": [
    {
      "unitName": "Unit 1: Title",
      "topics": [
        {
          "name": "Topic Name",
          "difficulty": "Easy" | "Medium" | "Hard",
          "subtopics": [{ "name": "Subtopic Name" }]
        }
      ]
    }
  ],
  "learningObjectives": ["string"],
  "importantTerminology": ["string"]
}
`;
        data = await aiService.generateStructuredJson<SyllabusExtractionData>(prompt);
      } catch (err) {
        console.warn('AI syllabus extraction failed, using heuristic engine:', err);
      }
    }

    if (!data || !data.units || data.units.length === 0) {
      data = this.heuristicExtract(rawText, filename);
    }

    // 1. Get or create Course
    const courseName = data.courseName || this.inferCourseName(filename, rawText);
    let course = courseRepo.getByName(courseName);
    if (!course) {
      const code = data.courseCode || courseName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + '201';
      course = await courseRepo.create({
        userId: 'user_1',
        name: courseName,
        code,
        term: 'Fall 2026',
        description: data.learningObjectives.length > 0 ? data.learningObjectives.join('. ') : `Curriculum for ${courseName}`,
      });
    }

    // 2. Build and persist Topic Tree in DB
    let totalTopics = 0;
    const existingTopics = topicRepo.getByCourse(course.id);
    const existingNames = new Set(existingTopics.map((t) => t.name.toLowerCase()));

    for (let uIdx = 0; uIdx < data.units.length; uIdx++) {
      const unit = data.units[uIdx];

      for (let tIdx = 0; tIdx < unit.topics.length; tIdx++) {
        const top = unit.topics[tIdx];
        if (!top.name.trim()) continue;

        let parentTopic: Topic | undefined;
        const normName = top.name.trim();

        if (existingNames.has(normName.toLowerCase())) {
          parentTopic = existingTopics.find((t) => t.name.toLowerCase() === normName.toLowerCase());
        } else {
          parentTopic = await topicRepo.create({
            courseId: course.id,
            parentTopicId: null,
            name: normName,
            description: `${unit.unitName || `Unit ${uIdx + 1}`}: ${normName}`,
            orderIndex: existingTopics.length + totalTopics + 1,
            depth: 1,
            pyqFrequency: 'Medium',
            difficulty: top.difficulty || 'Medium',
          });
          await coverageRepo.upsert(parentTopic.id, 50);
          existingNames.add(normName.toLowerCase());
          totalTopics++;
        }

        // Subtopics (depth: 2)
        if (parentTopic && top.subtopics && top.subtopics.length > 0) {
          for (let sIdx = 0; sIdx < top.subtopics.length; sIdx++) {
            const sub = top.subtopics[sIdx];
            const subName = sub.name.trim();
            if (!subName || existingNames.has(subName.toLowerCase())) continue;

            const childTopic = await topicRepo.create({
              courseId: course.id,
              parentTopicId: parentTopic.id,
              name: subName,
              description: `Subtopic of ${parentTopic.name}`,
              orderIndex: sIdx + 1,
              depth: 2,
              pyqFrequency: 'Medium',
              difficulty: sub.difficulty || 'Medium',
            });
            await coverageRepo.upsert(childTopic.id, 45);
            existingNames.add(subName.toLowerCase());
            totalTopics++;

            // Sub-subtopics (depth: 3) if any
            if (sub.subtopics && sub.subtopics.length > 0) {
              for (let ssIdx = 0; ssIdx < sub.subtopics.length; ssIdx++) {
                const ss = sub.subtopics[ssIdx];
                const ssName = ss.name.trim();
                if (!ssName || existingNames.has(ssName.toLowerCase())) continue;

                await topicRepo.create({
                  courseId: course.id,
                  parentTopicId: childTopic.id,
                  name: ssName,
                  description: `Sub-topic of ${childTopic.name}`,
                  orderIndex: ssIdx + 1,
                  depth: 3,
                  pyqFrequency: 'Medium',
                  difficulty: ss.difficulty || 'Medium',
                });
                await coverageRepo.upsert(childTopic.id, 40);
                existingNames.add(ssName.toLowerCase());
                totalTopics++;
              }
            }
          }
        }
      }
    }

    // User feedback messages: clean, informative, no technical AI jargon
    const feedback = [
      'Your syllabus is ready.',
      `${totalTopics} topic${totalTopics === 1 ? '' : 's'} indexed in topic tree.`,
    ];

    return {
      course,
      topicCount: totalTopics,
      unitsCount: data.units.length,
      learningObjectives: data.learningObjectives,
      importantTerminology: data.importantTerminology,
      feedback,
    };
  }

  /**
   * Deterministic, content-driven parsing of syllabus structure.
   */
  public heuristicExtract(text: string, filename: string): SyllabusExtractionData {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const courseName = this.inferCourseName(filename, text);

    const units: ExtractedUnit[] = [];
    const learningObjectives: string[] = [];
    const importantTerminology: string[] = [];

    let currentUnit: ExtractedUnit = { unitName: 'Unit 1: Foundations', topics: [] };
    let currentTopic: ExtractedTopicNode | null = null;
    let inObjectives = false;
    let inTerminology = false;

    const unitRegex = /^(?:unit|module|chapter|part)\s+([0-9ivx]+)[\s:.-]*(.*)$/i;
    const bulletRegex = /^[-*•▪–—]\s*(.*)$/;
    const numberedRegex = /^(\d+\.\d+|\d+\.)\s*(.*)$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Check section switches
      if (/(learning\s*objectives|course\s*outcomes|course\s*objectives)/i.test(line)) {
        inObjectives = true;
        inTerminology = false;
        continue;
      }
      if (/(important\s*terminology|key\s*terms|glossary|terminology)/i.test(line)) {
        inTerminology = true;
        inObjectives = false;
        continue;
      }
      if (/(prerequisites|textbooks|references|evaluation\s*scheme)/i.test(line)) {
        inObjectives = false;
        inTerminology = false;
      }

      if (inObjectives) {
        const cleaned = line.replace(/^[-*•\d.)\s]+/, '').trim();
        if (cleaned.length > 5 && !unitRegex.test(line)) {
          learningObjectives.push(cleaned);
          continue;
        } else {
          inObjectives = false;
        }
      }

      if (inTerminology) {
        const cleaned = line.replace(/^[-*•\d.)\s]+/, '').trim();
        if (cleaned.length > 2 && !unitRegex.test(line)) {
          importantTerminology.push(cleaned);
          continue;
        } else {
          inTerminology = false;
        }
      }

      // Check Unit boundary
      const unitMatch = line.match(unitRegex);
      if (unitMatch) {
        if (currentUnit.topics.length > 0) {
          units.push(currentUnit);
        }
        const uNum = unitMatch[1];
        const uTitle = unitMatch[2]?.trim() || `Unit ${uNum}`;
        currentUnit = {
          unitName: `Unit ${uNum}: ${uTitle}`,
          topics: [],
        };
        currentTopic = null;
        continue;
      }

      // Check subtopic or topic lines
      const bulletMatch = line.match(bulletRegex);
      const numMatch = line.match(numberedRegex);

      if (bulletMatch || numMatch) {
        const itemText = (bulletMatch ? bulletMatch[1] : numMatch![2]).trim();
        if (!itemText) continue;

        // If line has sub-items separated by colons or dashes or nested commas
        if (itemText.includes(':') && !itemText.toLowerCase().startsWith('http')) {
          const [parentName, rest] = itemText.split(':');
          const subNames = rest.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 1);

          currentTopic = {
            name: parentName.trim(),
            difficulty: 'Medium',
            subtopics: subNames.map((s) => ({ name: s, difficulty: 'Medium' })),
          };
          currentUnit.topics.push(currentTopic);
        } else if (currentTopic && (line.startsWith('  ') || line.startsWith('\t') || numMatch?.[1]?.includes('.'))) {
          // Subtopic of current topic
          currentTopic.subtopics = currentTopic.subtopics || [];
          currentTopic.subtopics.push({ name: itemText, difficulty: 'Medium' });
        } else {
          // Primary topic
          currentTopic = {
            name: itemText,
            difficulty: 'Medium',
            subtopics: [],
          };
          currentUnit.topics.push(currentTopic);
        }
      } else if (line.length > 3 && line.length < 60 && !line.includes('http') && !line.includes('Page ')) {
        // Plain text potential topic
        if (!unitRegex.test(line)) {
          currentTopic = {
            name: line,
            difficulty: 'Medium',
            subtopics: [],
          };
          currentUnit.topics.push(currentTopic);
        }
      }
    }

    if (currentUnit.topics.length > 0) {
      units.push(currentUnit);
    }

    // Fallback if no structured units were captured
    if (units.length === 0 || units.every((u) => u.topics.length === 0)) {
      units.push({
        unitName: 'Unit 1: Core Curriculum',
        topics: [
          {
            name: 'Foundations of ' + courseName,
            difficulty: 'Easy',
            subtopics: [{ name: 'Basic Principles' }, { name: 'Key Concepts' }],
          },
          {
            name: 'Core Methods & Architectures',
            difficulty: 'Medium',
            subtopics: [{ name: 'Primary Algorithms' }, { name: 'Implementation' }],
          },
          {
            name: 'Advanced Systems & Analysis',
            difficulty: 'Hard',
            subtopics: [{ name: 'Optimization' }, { name: 'Performance Analysis' }],
          },
        ],
      });
    }

    return {
      courseName,
      units,
      learningObjectives: learningObjectives.slice(0, 8),
      importantTerminology: importantTerminology.slice(0, 15),
    };
  }

  private inferCourseName(filename: string, content: string): string {
    const f = filename.toLowerCase();
    const c = content.toLowerCase();

    // Check for explicit Course Name headers
    const m = content.match(/(?:course|subject)\s*(?:name|title)?\s*[:=-]\s*([A-Za-z0-9\s&]+)/i);
    if (m && m[1].trim().length > 2 && m[1].trim().length < 40) {
      return m[1].trim();
    }

    if (f.includes('os') || f.includes('operating') || c.includes('operating systems')) return 'Operating Systems';
    if (f.includes('dbms') || f.includes('database') || c.includes('database management')) return 'DBMS';
    if (f.includes('network') || f.includes('cn') || c.includes('computer networks')) return 'Computer Networks';
    if (f.includes('discrete') || c.includes('discrete mathematics')) return 'Discrete Mathematics';
    if (f.includes('ds') || f.includes('data_struct') || c.includes('data structures')) return 'Data Structures';

    // First line heading if short
    const firstLine = content.split('\n')[0]?.replace(/[#*_-]/g, '').trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 35 && !firstLine.toLowerCase().includes('syllabus')) {
      return firstLine;
    }

    return 'Data Structures';
  }
}

export const syllabusExtractor = new SyllabusExtractor();
