// tests/test-planner.ts
// Test suite for Lucent's AI study planner service and schema validation

import { aiPlannerService } from '../src/services/ai-planner';

async function runPlannerTests() {
  console.log('====================================================');
  console.log('LUCENT AI STUDY PLANNER VERIFICATION');
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

  // -------------------------------------------------------------------------
  // TEST 1: STANDARD PLAN GENERATION
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Standard Plan Generation ---');
  const input = {
    examDate: '2026-10-10',
    hoursPerDay: 3,
    subjects: ['Mathematics'],
    topics: ['Probability', 'Calculus', 'Algebra'],
    confidence: {
      Probability: 'Low',
      Calculus: 'Medium',
      Algebra: 'High',
    },
  };

  const plan = await aiPlannerService.generatePlan(input);

  assert(typeof plan.summary === 'string' && plan.summary.length > 10, 'Summary is a descriptive string');
  assert(Array.isArray(plan.days) && plan.days.length > 0, `Days array returned (${plan.days.length} days)`);

  const firstDay = plan.days[0];
  assert(/^\d{4}-\d{2}-\d{2}$/.test(firstDay.date), `Valid ISO date string format: ${firstDay.date}`);
  assert(firstDay.totalMinutes <= 3 * 60, `Total daily minutes (${firstDay.totalMinutes}) does not exceed available limit (180 mins)`);

  // Verify sessions
  const sessions = firstDay.sessions;
  assert(sessions.length > 0, `Sessions generated for day (${sessions.length} sessions)`);
  const sessionSum = sessions.reduce((acc, s) => acc + s.duration, 0);
  assert(sessionSum === firstDay.totalMinutes, `Session duration sum (${sessionSum}) matches totalMinutes (${firstDay.totalMinutes})`);

  // Check activity types
  const validTypes = new Set(['Learn', 'Practice', 'Revision']);
  const allTypesValid = sessions.every((s) => validTypes.has(s.type));
  assert(allTypesValid, 'Session types strictly limited to Learn, Practice, or Revision');

  // Verify confidence-based assignment
  const probSession = sessions.find((s) => s.topic === 'Probability');
  assert(probSession?.type === 'Learn' || probSession?.type === 'Practice', 'Low confidence topic assigned Learn/Practice');
  const algSession = sessions.find((s) => s.topic === 'Algebra');
  assert(algSession?.type === 'Revision', 'High confidence topic assigned Revision');

  // -------------------------------------------------------------------------
  // TEST 2: STRICT TIME CAPPING (NEVER EXCEED DAILY HOURS)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Strict Time Capping (Never Exceed Available Time) ---');
  const tightInput = {
    examDate: '2026-10-06',
    hoursPerDay: 1.5, // 90 minutes max
    subjects: ['Data Structures'],
    topics: ['AVL Trees', 'Graphs', 'Arrays'],
    confidence: { 'AVL Trees': 'Low', Graphs: 'Medium', Arrays: 'High' },
  };

  const tightPlan = await aiPlannerService.generatePlan(tightInput);
  const maxAllowedMins = 90;

  for (const day of tightPlan.days) {
    const sum = day.sessions.reduce((acc, s) => acc + s.duration, 0);
    assert(day.totalMinutes <= maxAllowedMins, `Day ${day.date} total (${day.totalMinutes}m) <= limit (${maxAllowedMins}m)`);
    assert(sum === day.totalMinutes, `Day ${day.date} sum equals totalMinutes`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: VALIDATION AND REPAIR OF MALFORMED AI DATA
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Validation of Malformed AI Data ---');
  const malformedAiOutput = {
    summary: 'Custom generated plan with oversized durations.',
    days: [
      {
        date: 'invalid-date',
        totalMinutes: 9999, // impossible schedule
        sessions: [
          { subject: 'Math', topic: 'Calculus', duration: 300, type: 'Chatbot' }, // invalid type & duration
          { subject: 'Math', topic: 'Algebra', duration: 200, type: 'Practice' },
        ],
      },
    ],
  };

  const validated = aiPlannerService.validateAndNormalizePlan(malformedAiOutput, {
    examDate: '2026-10-10',
    hoursPerDay: 3,
    daysRemaining: 7,
    subjects: ['Math'],
    topics: [{ name: 'Calculus', confidence: 'Medium' }, { name: 'Algebra', confidence: 'High' }],
  });

  assert(validated !== null, 'Validator repairs malformed input instead of crashing');
  if (validated) {
    const fixedDay = validated.days[0];
    assert(fixedDay.totalMinutes <= 180, `Oversized schedule clamped to available time (${fixedDay.totalMinutes} mins)`);
    assert(fixedDay.sessions.every((s) => ['Learn', 'Practice', 'Revision'].includes(s.type)), 'Invalid session types repaired');
  }

  // -------------------------------------------------------------------------
  // TEST 4: EMPTY & EDGE CASE INPUTS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Edge Case Inputs ---');
  const emptyPlan = await aiPlannerService.generatePlan({});
  assert(emptyPlan.days.length > 0, 'Gracefully handles empty inputs with default plan');
  assert(emptyPlan.summary.length > 0, 'Generates valid summary for default plan');

  console.log('\n====================================================');
  console.log(`PLANNER VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlannerTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
