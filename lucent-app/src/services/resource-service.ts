// src/services/resource-service.ts
// Gap-driven learning resource recommendation engine
import { resourceRepo, coverageRepo, topicRepo } from '../lib/db/repositories';
import { Resource } from '../lib/models/types';

export interface SubjectResourceGroup {
  subject: string;
  resources: Resource[];
}

export class ResourceService {
  /**
   * Retrieves recommended resources grouped by subject, prioritized by topic gaps.
   */
  public getRecommendedResources(): SubjectResourceGroup[] {
    const all = resourceRepo.getAll();
    const coverages = coverageRepo.getAll();
    const covMap = new Map(coverages.map((c) => [c.topicId, c.score]));
    const topicMap = new Map(topicRepo.getAll().map((t) => [t.id, t]));

    // Dynamically adjust relevance based on current student gaps
    const evaluated = all.map((res) => {
      if (res.topicId) {
        const score = covMap.get(res.topicId) ?? 50;
        const topic = topicMap.get(res.topicId);
        const isUrgent = score < 50 || (topic && topic.pyqFrequency === 'High');
        return {
          ...res,
          relevance: isUrgent ? ('High' as const) : res.relevance,
        };
      }
      return res;
    });

    const subjects = [...new Set(evaluated.map((r) => r.subject))];
    return subjects.map((subject) => ({
      subject,
      resources: evaluated.filter((r) => r.subject === subject),
    }));
  }

  /**
   * Add a new learning resource tied to a topic or course.
   */
  public async addResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
    return resourceRepo.create(resource);
  }
}

export const resourceService = new ResourceService();
