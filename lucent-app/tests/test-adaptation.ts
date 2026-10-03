// tests/test-adaptation.ts
// Test suite for Lucent's Adaptive Study Loop (Phase 4)

import { adaptationService } from '../src/services/adaptation-service';
import { aiPlannerService } from '../src/services/ai-planner';

async function runAdaptationTests() {
  console.log('====================================================');
  console.log('LUCENT ADAPTIVE STUDY LOOP VERIFICATION');
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

  // 1. Initial Plan Baseline (Spec Example)
  // Before: Probability: 45 min, Calculus: 60 min, Algebra: 30 min (Total: 135 / 180 min)
  const initialPlan = {
    summary: 'Initial baseline schedule with balanced study allocations.',
    days: [
      {
        date: '2026-10-04',
        totalMinutes: 135,
        sessions: [
          { subject: 'Mathematics', topic: 'Probability', duration: 45, type: 'Learn' as const },
          { subject: 'Mathematics', topic: 'Calculus', duration: 60, type: 'Practice' as const },
          { subject: 'Mathematics', topic: 'Algebra', duration: 30, type: 'Revision' as const },
        ],
      },
      {
        date: '2026-10-05',
        totalMinutes: 135,
        sessions: [
          { subject: 'Mathematics', topic: 'Calculus', duration: 60, type: 'Learn' as const },
          { subject: 'Mathematics', topic: 'Algebra', duration: 45, type: 'Practice' as const },
          { subject: 'Mathematics', topic: 'Probability', duration: 30, type: 'Revision' as const },
        ],
      },
    ],
  };

  // -------------------------------------------------------------------------
  // TEST 1: ADAPTATION RULE — "struggled"
  // If "struggled":
  // - increase learning/review time
  // - give the topic another opportunity
  // - reduce lower-priority work if necessary
  // - never exceed available study time (e.g. 180m)
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Adaptation with feedback: "struggled" ---');
  const struggledAdaptation = await adaptationService.adaptPlan({
    currentPlan: initialPlan,
    completedSession: {
      sessionId: 'sess_1',
      subject: 'Mathematics',
      topic: 'Probability',
      duration: 45,
      type: 'Learn',
    },
    feedback: 'struggled',
    daysRemaining: 7,
    hoursPerDay: 3,
  });

  assert(typeof struggledAdaptation.summary === 'string', 'Summary string returned');
  assert(struggledAdaptation.days.length > 0, 'Days array returned');
  assert(struggledAdaptation.adaptation !== undefined, 'Adaptation metadata returned');
  assert(struggledAdaptation.adaptation.status === 'struggled', 'Adaptation status preserved as "struggled"');
  assert(
    struggledAdaptation.adaptation.noticed.toLowerCase().includes('probability') ||
    struggledAdaptation.adaptation.noticed.toLowerCase().includes('struggled'),
    'Adaptation correctly identified "What Lucent noticed"'
  );
  assert(
    typeof struggledAdaptation.adaptation.reason === 'string' && struggledAdaptation.adaptation.reason.length > 10,
    'Adaptation explains "Why the plan changed"'
  );

  const day1Struggled = struggledAdaptation.days[0];
  const probSession = day1Struggled.sessions.find((s) => s.topic.toLowerCase() === 'probability');
  assert(Boolean(probSession), 'Probability is scheduled in day 1');
  assert(
    probSession !== undefined && probSession.duration > 45,
    `Probability learning time increased from 45 min to ${probSession?.duration} min`
  );
  assert(
    probSession?.type === 'Learn',
    `Probability session type is set to Learn (was ${probSession?.type})`
  );
  assert(
    day1Struggled.totalMinutes <= 180,
    `Total daily minutes (${day1Struggled.totalMinutes}) does not exceed available 180 min budget`
  );

  // -------------------------------------------------------------------------
  // TEST 2: ADAPTATION RULE — "needs_practice"
  // If "needs_practice":
  // - increase practice for that topic
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Adaptation with feedback: "needs_practice" ---');
  const practiceAdaptation = await adaptationService.adaptPlan({
    currentPlan: initialPlan,
    completedSession: {
      sessionId: 'sess_2',
      subject: 'Mathematics',
      topic: 'Calculus',
      duration: 60,
      type: 'Learn',
    },
    feedback: 'needs_practice',
    daysRemaining: 7,
    hoursPerDay: 3,
  });

  const day1Practice = practiceAdaptation.days[0];
  const calcSession = day1Practice.sessions.find((s) => s.topic.toLowerCase() === 'calculus');
  assert(Boolean(calcSession), 'Calculus is scheduled in day 1');
  assert(
    calcSession?.type === 'Practice',
    `Calculus session shifted to "Practice" (got: ${calcSession?.type})`
  );
  assert(
    day1Practice.totalMinutes <= 180,
    `Total daily minutes (${day1Practice.totalMinutes}) does not exceed 180 min budget`
  );

  // -------------------------------------------------------------------------
  // TEST 3: ADAPTATION RULE — "understood"
  // If "understood":
  // - reduce repetitive learning
  // - move toward practice/revision
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Adaptation with feedback: "understood" ---');
  const understoodAdaptation = await adaptationService.adaptPlan({
    currentPlan: initialPlan,
    completedSession: {
      sessionId: 'sess_3',
      subject: 'Mathematics',
      topic: 'Probability',
      duration: 45,
      type: 'Learn',
    },
    feedback: 'understood',
    daysRemaining: 7,
    hoursPerDay: 3,
  });

  const day1Understood = understoodAdaptation.days[0];
  const probUnderstoodSession = day1Understood.sessions.find((s) => s.topic.toLowerCase() === 'probability');
  assert(Boolean(probUnderstoodSession), 'Probability is scheduled in day 1');
  assert(
    probUnderstoodSession?.type === 'Revision',
    `Probability repetitive learning reduced and moved to "Revision" (got: ${probUnderstoodSession?.type})`
  );
  assert(
    probUnderstoodSession !== undefined && probUnderstoodSession.duration <= 30,
    `Probability review duration trimmed to ${probUnderstoodSession?.duration} min`
  );

  // -------------------------------------------------------------------------
  // TEST 4: BEFORE VS AFTER PLAN DIFF INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Before vs After Plan Diff Integrity ---');
  const diff = struggledAdaptation.adaptation;
  assert(Array.isArray(diff.beforeSessions) && diff.beforeSessions.length > 0, 'beforeSessions array populated');
  assert(Array.isArray(diff.afterSessions) && diff.afterSessions.length > 0, 'afterSessions array populated');
  console.log('  Before sessions:', diff.beforeSessions.map((s) => `${s.topic} (${s.duration}m)`).join(', '));
  console.log('  After sessions: ', diff.afterSessions.map((s) => `${s.topic} (${s.duration}m)`).join(', '));

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdaptationTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
