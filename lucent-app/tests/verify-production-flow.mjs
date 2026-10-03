// tests/verify-production-flow.mjs
// Automated verification of the clean production state & full student flow
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DATA_DIR = path.join(process.cwd(), '.lucent');

function resetCleanState() {
  const activePlanPath = path.join(DATA_DIR, 'active_plan.json');
  if (fs.existsSync(activePlanPath)) {
    fs.unlinkSync(activePlanPath);
  }
  const dbPath = path.join(DATA_DIR, 'db.json');
  const emptyDb = {
    users: [
      {
        id: 'user_1',
        name: 'Scholar',
        email: '',
        avatar: 'S',
        examDate: '2026-10-10',
        dailyStudyGoalMinutes: 180,
        deadlineReminders: true,
        coverageAlerts: true,
        createdAt: '2026-10-03T11:00:00.000Z',
        updatedAt: '2026-10-03T11:00:00.000Z',
      },
    ],
    courses: [],
    documents: [],
    topics: [],
    topicRelationships: [],
    coverages: [],
    pyqQuestions: [],
    deadlines: [],
    conflicts: [],
    studyPlanItems: [],
    resources: [],
    tutorConversations: [],
    tutorMessages: [],
  };
  fs.writeFileSync(dbPath, JSON.stringify(emptyDb, null, 2), 'utf-8');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('--- 0. RESET TO CLEAN REPOSITORY INITIAL STATE ---');
  resetCleanState();

  console.log('\n--- 1. VERIFY CLEAN INITIAL STATE ---');
  
  // 1. Settings / User Profile
  const settings = await request('/api/settings');
  const userName = settings.data.user?.name || settings.data.name;
  console.log('Settings:', userName === 'Scholar' ? 'PASS (Scholar)' : 'FAIL', userName);
  if (userName !== 'Scholar') throw new Error('Expected Scholar user profile');

  // 2. Signals
  const signals = await request('/api/signals');
  const readiness = signals.data.signals?.overallReadiness ?? signals.data.overallReadiness;
  console.log('Signals initial:', readiness === 0 ? 'PASS (0% Readiness)' : 'FAIL', readiness);
  if (readiness !== 0) throw new Error(`Expected 0% readiness on initial state, got ${readiness}`);

  // 3. Documents
  const docs = await request('/api/documents');
  const docCount = (docs.data.documents || docs.data).length;
  console.log('Documents initial:', docCount === 0 ? 'PASS (0 documents)' : 'FAIL', docCount);
  if (docCount !== 0) throw new Error('Expected 0 documents on initial state');

  // 4. Topics
  const topics = await request('/api/topics');
  const subjCount = (topics.data.subjects || []).length;
  console.log('Topics initial:', subjCount === 0 ? 'PASS (0 topics)' : 'FAIL', subjCount);
  if (subjCount !== 0) throw new Error('Expected 0 topics on initial state');

  // 5. Deadlines
  const deadlines = await request('/api/deadlines');
  const deadlineCount = (deadlines.data.deadlines || []).length;
  console.log('Deadlines initial:', deadlineCount === 0 ? 'PASS (0 deadlines)' : 'FAIL', deadlineCount);
  if (deadlineCount !== 0) throw new Error('Expected 0 deadlines on initial state');

  // 6. Plan initial
  const planInitial = await request('/api/plan');
  console.log('Plan initial:', planInitial.data.days?.length === 0 ? 'PASS (Empty Plan)' : 'FAIL', planInitial.data.days?.length);
  if (planInitial.data.days?.length !== 0) throw new Error('Expected empty plan on initial state');

  console.log('\n--- 2. STUDENT SETS UP AND BUILDS CUSTOM PLAN ---');
  const customPlanRes = await request('/api/plan', {
    method: 'POST',
    body: JSON.stringify({
      examDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      hoursPerDay: 3,
      subjects: ['Computer Architecture'],
      topics: ['Pipeline Hazards', 'Cache Coherence'],
      confidence: {
        'Pipeline Hazards': 'Low',
        'Cache Coherence': 'Medium',
      },
    }),
  });

  console.log('Plan Generation status:', customPlanRes.status);
  console.log('Plan Summary:', customPlanRes.data.summary);
  console.log('Days generated:', customPlanRes.data.days?.length);
  if (!customPlanRes.data.days || customPlanRes.data.days.length === 0) {
    throw new Error('Failed to generate custom study plan');
  }

  const firstSession = customPlanRes.data.days[0].sessions[0];
  console.log('First session item:', firstSession);

  console.log('\n--- 3. COMPLETE STUDY SESSION & RECORD FEEDBACK ---');
  const feedbackRes = await request('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: 'sess_test_1',
      subject: firstSession.subject,
      topic: firstSession.topic,
      status: 'struggled',
    }),
  });
  console.log('Feedback response:', feedbackRes.data);

  console.log('\n--- 4. TRIGGER ADAPTATION LOOP ---');
  const adaptRes = await request('/api/adapt', {
    method: 'POST',
    body: JSON.stringify({
      completedSession: {
        sessionId: 'sess_test_1',
        subject: firstSession.subject,
        topic: firstSession.topic,
        duration: firstSession.duration,
        type: firstSession.type,
      },
      feedback: 'struggled',
      hoursPerDay: 3,
      daysRemaining: 7,
    }),
  });

  console.log('Adaptation status:', adaptRes.status);
  console.log('Adaptation notice:', adaptRes.data.adaptation?.noticed);
  console.log('Adaptation reason:', adaptRes.data.adaptation?.reason);
  if (!adaptRes.data.adaptation) throw new Error('Adaptation details missing from response');

  console.log('\n--- 5. VERIFY REFRESH / PERSISTED PLAN STATE ---');
  const persistedPlan = await request('/api/plan');
  console.log('Persisted Plan summary:', persistedPlan.data.summary);
  console.log('Persisted Plan days count:', persistedPlan.data.days?.length);
  console.log('Persisted Adaptation saved:', Boolean(persistedPlan.data.adaptation));
  console.log('Persisted Feedback log:', persistedPlan.data.feedbackHistory?.length, 'entry');

  if (!persistedPlan.data.days || persistedPlan.data.days.length === 0) {
    throw new Error('Plan did not persist across refresh call');
  }

  console.log('\n--- 6. RESET REPO BACK TO CLEAN INITIAL PRODUCTION STATE ---');
  resetCleanState();
  console.log('Database and active plan reset to pristine production state.');

  console.log('\n=== ALL USER FLOW TESTS PASSED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Flow test error:', err);
  process.exit(1);
});
