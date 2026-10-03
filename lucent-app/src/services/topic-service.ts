// src/services/topic-service.ts
// Structured academic knowledge, topic tree hierarchy, and coverage analysis
import { topicRepo, coverageRepo, compositeRepo } from '../lib/db/repositories';
import { SubjectCoverageSummary, TopicWithSubtopics } from '../lib/models/types';

export class TopicService {
  /**
   * Retrieves full topic hierarchy with coverage scores for a given course.
   */
  public getCourseTopics(courseId: string): TopicWithSubtopics[] {
    return compositeRepo.getTopicHierarchy(courseId);
  }

  /**
   * Retrieves all subjects with aggregated coverage metrics.
   */
  public getAllSubjects(): SubjectCoverageSummary[] {
    return compositeRepo.getAllSubjectsCoverage();
  }

  /**
   * Ingests topic names from a document and integrates them into the course knowledge tree.
   */
  public async ingestTopicsFromDocument(courseId: string, topicNames: string[]): Promise<void> {
    const existing = topicRepo.getByCourse(courseId);
    const existingNames = new Set(existing.map((t) => t.name.toLowerCase()));

    for (let i = 0; i < topicNames.length; i++) {
      const name = topicNames[i].trim();
      if (!name || existingNames.has(name.toLowerCase())) continue;

      const created = await topicRepo.create({
        courseId,
        parentTopicId: null,
        name,
        orderIndex: existing.length + i + 1,
        depth: 1,
        pyqFrequency: 'Medium',
        difficulty: 'Medium',
      });

      // Initial baseline coverage for newly extracted topic
      await coverageRepo.upsert(created.id, 50);
    }
  }

  /**
   * Evaluates or re-calculates coverage for a topic based on study actions.
   */
  public async recordTopicStudy(topicId: string, pointsGained: number): Promise<number> {
    const current = coverageRepo.getByTopic(topicId);
    const prevScore = current ? current.score : 40;
    const newScore = Math.min(100, Math.max(0, prevScore + pointsGained));
    await coverageRepo.upsert(topicId, newScore);
    return newScore;
  }

  /**
   * Identifies all topics that are currently missing adequate coverage (< 60%).
   */
  public getMissingTopics(): Array<{ id: string; name: string; courseId: string; coverage: number }> {
    const topics = topicRepo.getAll();
    const coverages = coverageRepo.getAll();
    const covMap = new Map(coverages.map((c) => [c.topicId, c.score]));

    return topics
      .map((t) => ({
        id: t.id,
        name: t.name,
        courseId: t.courseId,
        coverage: covMap.get(t.id) ?? 50,
      }))
      .filter((t) => t.coverage < 60);
  }
}

export const topicService = new TopicService();
