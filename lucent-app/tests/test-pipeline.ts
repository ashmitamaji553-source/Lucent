// tests/test-pipeline.ts
// Comprehensive automated test suite for Phase 2 Smart Upload pipeline

import fs from 'fs';
import path from 'path';
import { textExtractor } from '../src/services/text-extractor';
import { documentClassifier } from '../src/services/classifier';
import { documentProcessor } from '../src/services/document-processor';
import { topicRepo, pyqRepo, deadlineRepo, conflictRepo, compositeRepo } from '../src/lib/db/repositories';

const SAMPLES_DIR = path.join(__dirname, 'sample-documents');

async function runTests() {
  console.log('====================================================');
  console.log('LUCENT PHASE 2: SMART UPLOAD PIPELINE VERIFICATION');
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
  // TEST 1: SYLLABUS PROCESSING & TOPIC TREE CREATION
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Syllabus Upload (Operating_Systems_Syllabus.txt) ---');
  const syllabusPath = path.join(SAMPLES_DIR, 'Operating_Systems_Syllabus.txt');
  const syllabusBuffer = fs.readFileSync(syllabusPath);

  // Classification check
  const syllabusClass = await documentClassifier.classify(syllabusBuffer.toString('utf-8'), 'Operating_Systems_Syllabus.txt');
  assert(syllabusClass.type === 'Syllabus', 'Classification identifies as Syllabus', `Got ${syllabusClass.type}`);

  // Pipeline execution
  const syllabusResult = await documentProcessor.processUpload(
    'Operating_Systems_Syllabus.txt',
    syllabusBuffer,
    'text/plain'
  );
  assert(syllabusResult.detectedType === 'Syllabus', 'Pipeline detects Syllabus type');
  assert(syllabusResult.feedback.some((f) => f.includes('syllabus is ready')), 'Clean user feedback "Your syllabus is ready"');

  // Verify Topic Tree in DB
  const osTopics = topicRepo.getByCourse(syllabusResult.document.courseId);
  assert(osTopics.length >= 4, `Topic tree created in database (Found ${osTopics.length} topics)`);
  const hasSubtopics = osTopics.some((t) => t.parentTopicId !== null);
  assert(hasSubtopics, 'Topic hierarchy contains subtopics (parent-child links)');

  // -------------------------------------------------------------------------
  // TEST 2: LECTURE NOTES EXTRACTION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Notes Upload (DBMS_Unit2_Notes.txt) ---');
  const notesPath = path.join(SAMPLES_DIR, 'DBMS_Unit2_Notes.txt');
  const notesBuffer = fs.readFileSync(notesPath);

  const notesClass = await documentClassifier.classify(notesBuffer.toString('utf-8'), 'DBMS_Unit2_Notes.txt');
  assert(notesClass.type === 'Notes', 'Classification identifies as Notes', `Got ${notesClass.type}`);

  const notesResult = await documentProcessor.processUpload(
    'DBMS_Unit2_Notes.txt',
    notesBuffer,
    'text/plain'
  );
  assert(notesResult.detectedType === 'Notes', 'Pipeline detects Notes type');
  assert(notesResult.feedback.some((f) => f.includes('Lecture notes processed')), 'Clean user feedback for notes');

  // -------------------------------------------------------------------------
  // TEST 3: PYQ EXTRACTION & TOPIC LINKING
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing PYQ Upload (DS_EndSem_2025_PYQ.txt) ---');
  const pyqPath = path.join(SAMPLES_DIR, 'DS_EndSem_2025_PYQ.txt');
  const pyqBuffer = fs.readFileSync(pyqPath);

  const pyqClass = await documentClassifier.classify(pyqBuffer.toString('utf-8'), 'DS_EndSem_2025_PYQ.txt');
  assert(pyqClass.type === 'PYQs', 'Classification identifies as PYQ', `Got ${pyqClass.type}`);

  const pyqResult = await documentProcessor.processUpload(
    'DS_EndSem_2025_PYQ.txt',
    pyqBuffer,
    'text/plain'
  );
  assert(pyqResult.detectedType === 'PYQs', 'Pipeline detects PYQs type');
  assert(pyqResult.feedback.some((f) => f.includes('PYQ paper indexed')), 'Clean user feedback for PYQ');

  const pyqQuestions = pyqRepo.getAll().filter((q) => q.documentId === pyqResult.document.id);
  assert(pyqQuestions.length >= 4, `Extracted ${pyqQuestions.length} exam questions`);
  assert(pyqQuestions.some((q) => q.marks === 5 || q.marks === 10), 'Marks accurately extracted for questions');
  assert(pyqQuestions.some((q) => q.difficulty === 'Hard' || q.difficulty === 'Medium'), 'Difficulty accurately inferred');
  assert(pyqQuestions.some((q) => q.questionType === 'Implementation' || q.questionType === 'Theory'), 'Question types extracted');
  const linkedQuestions = pyqQuestions.filter((q) => q.topicId);
  assert(linkedQuestions.length > 0, `Questions connected to topics in database (${linkedQuestions.length} connected)`);

  // -------------------------------------------------------------------------
  // TEST 4: NOTICE EXTRACTION & DEADLINES
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Notice Upload (Department_Exam_Notice.txt) ---');
  const noticePath = path.join(SAMPLES_DIR, 'Department_Exam_Notice.txt');
  const noticeBuffer = fs.readFileSync(noticePath);

  const noticeClass = await documentClassifier.classify(noticeBuffer.toString('utf-8'), 'Department_Exam_Notice.txt');
  assert(noticeClass.type === 'Notice', 'Classification identifies as Notice', `Got ${noticeClass.type}`);

  const noticeResult = await documentProcessor.processUpload(
    'Department_Exam_Notice.txt',
    noticeBuffer,
    'text/plain'
  );
  assert(noticeResult.detectedType === 'Notice', 'Pipeline detects Notice type');
  assert(noticeResult.feedback.some((f) => f.includes('deadlines detected')), 'Clean user feedback "X upcoming deadlines detected"');

  const noticeDeadlines = deadlineRepo.getAll().filter((d) => d.documentId === noticeResult.document.id);
  assert(noticeDeadlines.length >= 2, `Extracted ${noticeDeadlines.length} structured deadlines from notice`);
  assert(noticeDeadlines.some((d) => d.type === 'Exam'), 'Extracted Exam deadline');
  assert(noticeDeadlines.some((d) => d.time && d.time.length > 0), 'Extracted specific deadline times');

  // -------------------------------------------------------------------------
  // TEST 5: ERROR HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Error Handling ---');

  // A. Empty file
  try {
    await documentProcessor.processUpload('empty_file.txt', Buffer.from('   \n\n  '), 'text/plain');
    assert(false, 'Empty file should be rejected');
  } catch (err: any) {
    assert(err.message.includes('empty') || err.message.includes('no readable text'), 'Empty file rejected with clean message', err.message);
  }

  // B. Unsupported file
  try {
    await documentProcessor.processUpload('archive.zip', Buffer.from('PK\x03\x04'), 'application/zip');
    assert(false, 'Unsupported file should be rejected');
  } catch (err: any) {
    assert(err.message.includes('Unsupported file'), 'Unsupported file rejected with clean message', err.message);
  }

  // C. Oversized file
  try {
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26 MB
    await documentProcessor.processUpload('large.pdf', hugeBuffer, 'application/pdf');
    assert(false, 'Oversized file should be rejected');
  } catch (err: any) {
    assert(err.message.includes('exceeds the maximum upload limit'), 'Oversized file rejected with clean message', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: DASHBOARD SIGNAL & COVERAGE UPDATES
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Dashboard Signal & Metric Updates ---');
  const signals = compositeRepo.getSignals();
  assert(typeof signals.missingTopics === 'number', `Missing topics computed: ${signals.missingTopics}`);
  assert(signals.updatedNotices >= 1, `Updated notices computed: ${signals.updatedNotices}`);
  assert(signals.highPriorityTopics >= 1, `High priority topics computed: ${signals.highPriorityTopics}`);
  assert(signals.overallReadiness > 0, `Overall readiness computed: ${signals.overallReadiness}%`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
