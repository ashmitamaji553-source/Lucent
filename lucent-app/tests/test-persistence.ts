// tests/test-persistence.ts
// Test suite verifying Lucent's persistence and reliability mechanisms

import { planStore } from '../src/services/plan-store';

async function runPersistenceTests() {
  console.log('====================================================');
  console.log('LUCENT PERSISTENCE & RELIABILITY VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Plan Store Persistence
  console.log('--- 1. Testing Plan & Adaptation State Persistence ---');
  const demoPlan = {
    summary: 'Test persistent plan.',
    days: [
      {
        date: '2026-10-04',
        totalMinutes: 180,
        sessions: [
          { subject: 'Mathematics', topic: 'Probability', duration: 90, type: 'Learn' as const },
          { subject: 'Mathematics', topic: 'Calculus', duration: 60, type: 'Practice' as const },
          { subject: 'Mathematics', topic: 'Algebra', duration: 30, type: 'Revision' as const },
        ],
      },
    ],
  };

  const demoAdaptation = {
    noticed: 'Lucent noticed you struggled with Probability.',
    reason: "Probability needs another pass, so tomorrow's plan has been adjusted.",
    topic: 'Probability',
    status: 'struggled' as const,
    beforeSessions: [
      { subject: 'Mathematics', topic: 'Probability', duration: 45, type: 'Learn' as const },
      { subject: 'Mathematics', topic: 'Calculus', duration: 60, type: 'Practice' as const },
      { subject: 'Mathematics', topic: 'Algebra', duration: 30, type: 'Revision' as const },
    ],
    afterSessions: [
      { subject: 'Mathematics', topic: 'Probability', duration: 90, type: 'Learn' as const },
      { subject: 'Mathematics', topic: 'Calculus', duration: 60, type: 'Practice' as const },
      { subject: 'Mathematics', topic: 'Algebra', duration: 30, type: 'Revision' as const },
    ],
  };

  planStore.setActivePlan(demoPlan, demoAdaptation);
  const reloadedPlan = planStore.getActivePlan();
  assert(reloadedPlan !== null, 'Active plan persisted');
  assert(reloadedPlan?.summary === demoPlan.summary, 'Plan summary matches');
  assert(reloadedPlan?.days.length === 1, 'Days array length preserved');

  const reloadedAdapt = planStore.getLastAdaptation();
  assert(reloadedAdapt !== undefined, 'Last adaptation details persisted');
  assert(reloadedAdapt?.status === 'struggled', 'Adaptation status preserved');
  assert(reloadedAdapt?.afterSessions[0].duration === 90, 'Adapted session duration preserved');

  // 2. Session Completion Persistence
  console.log('\n--- 2. Testing Session Completion Persistence ---');
  planStore.markSession('2026-10-04_Probability_0', true);
  let completedMap = planStore.getCompletedSessionsMap();
  assert(completedMap['2026-10-04_Probability_0'] === true, 'Session marked complete');

  planStore.markSession('2026-10-04_Probability_0', false);
  completedMap = planStore.getCompletedSessionsMap();
  assert(!completedMap['2026-10-04_Probability_0'], 'Session reopened successfully');

  // 3. Feedback Logging Persistence
  console.log('\n--- 3. Testing Feedback Log Persistence ---');
  planStore.addFeedback({
    sessionId: 'sess_prob_1',
    subject: 'Mathematics',
    topic: 'Probability',
    status: 'struggled',
    timestamp: new Date().toISOString(),
  });

  const feedbackLog = planStore.getFeedbackLog();
  assert(feedbackLog.length > 0, 'Feedback log contains records');
  assert(feedbackLog[0].topic === 'Probability', 'Most recent feedback matches');
  assert(feedbackLog[0].status === 'struggled', 'Feedback status matches');

  // 4. Checking that feedback also marks session complete
  completedMap = planStore.getCompletedSessionsMap();
  assert(completedMap['sess_prob_1'] === true, 'Feedback submission persists session completion');

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceTests().catch((err) => {
  console.error('Persistence test failed:', err);
  process.exit(1);
});
