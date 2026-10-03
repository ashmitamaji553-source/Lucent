# LUCENT

## Project

Lucent is an adaptive AI study companion.

Tagline:

"Bring the hidden to light."

Core MVP:

"A study plan that learns from you."

---

# 1. PRODUCT VISION

Lucent helps students prepare for exams by creating realistic study plans that adapt to their actual performance.

Traditional study planners create a fixed schedule.

Lucent creates a plan, observes how the student performs, receives feedback, and adjusts the next plan.

Core loop:

PLAN → STUDY → FEEDBACK → ADAPT

---

# 2. MVP GOAL

The MVP must demonstrate one complete experience:

1. Student enters exam information.
2. Student enters available study time.
3. Student enters subjects/topics.
4. Student provides confidence levels.
5. Lucent generates an adaptive study plan.
6. Student completes a study session.
7. Student gives feedback.
8. Lucent adapts the future plan.

The adaptive loop is the most important feature.

---

# 3. TARGET USER

Students preparing for exams.

Typical situations:

- 1 month before exam
- 2 weeks before exam
- 1 week before exam
- 1 day before exam

Lucent should adapt the amount and priority of study based on the remaining time.

---

# 4. MVP INPUTS

Required:

- Exam date
- Available study hours per day
- Subjects
- Topics
- Confidence level

Optional:

- Topic priority
- Previous study sessions
- Previous feedback

---

# 5. MVP OUTPUT

Lucent generates:

- Daily study plan
- Topic priority
- Study duration
- Activity type
- Revision sessions
- Practice sessions
- Short explanation of why topics were prioritized

Example:

{
  "summary": "Probability receives additional time because confidence is low and the exam is approaching.",
  "days": [
    {
      "date": "2026-10-03",
      "totalMinutes": 180,
      "sessions": [
        {
          "subject": "Mathematics",
          "topic": "Probability",
          "duration": 90,
          "type": "Learn"
        },
        {
          "subject": "Mathematics",
          "topic": "Calculus",
          "duration": 60,
          "type": "Practice"
        },
        {
          "subject": "Mathematics",
          "topic": "Algebra",
          "duration": 30,
          "type": "Revision"
        }
      ]
    }
  ]
}

---

# 6. ADAPTATION

After a study session, the student provides feedback.

Possible states:

- understood
- needs_practice
- struggled

The system uses feedback to modify future study allocation.

Example:

Before:

Probability: 45 minutes
Calculus: 60 minutes
Algebra: 30 minutes

Student feedback:

Probability = struggled

After:

Probability: 90 minutes
Calculus: 45 minutes
Algebra: 30 minutes

The adaptation must be visually obvious.

---

# 7. USER FLOW

Landing Page

↓

Setup

↓

Generate Plan

↓

View Plan

↓

Start Session

↓

Complete Session

↓

Give Feedback

↓

Adapt Plan

↓

View Updated Plan

---

# 8. TECH STACK

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Next.js API routes / Server Actions

Database:

- Supabase PostgreSQL

AI:

- LLM API with structured JSON output

Deployment:

- Vercel

Fallback storage:

- localStorage

---

# 9. ARCHITECTURE

Browser

↓

Next.js Application

↓

API Route

↓

LLM API

↓

Structured JSON

↓

Next.js

↓

UI

Supabase stores:

- plans
- sessions
- feedback

---

# 10. API ENDPOINTS

## POST /api/plan

Generates initial study plan.

Input:

{
  examDate,
  hoursPerDay,
  subjects,
  topics,
  confidence
}

Output:

{
  plan
}

---

## POST /api/feedback

Stores student feedback.

Input:

{
  sessionId,
  topic,
  status
}

---

## POST /api/adapt

Generates an updated study plan.

Input:

{
  currentPlan,
  feedback,
  daysRemaining,
  hoursPerDay
}

Output:

{
  updatedPlan
}

---

# 11. AI REQUIREMENTS

The AI must:

- prioritize urgent topics
- prioritize low-confidence topics
- consider available study time
- avoid unrealistic schedules
- include revision
- include practice
- adapt based on feedback
- return structured JSON

The AI must NOT:

- overload students
- create impossible schedules
- generate long explanations
- return unstructured text when JSON is expected

---

# 12. AI SYSTEM PROMPT

You are Lucent, an adaptive study planning assistant.

Your job is to create realistic study plans based on:

- exam date
- available study hours
- subjects
- topics
- confidence levels
- previous performance
- student feedback

Prioritize:

1. Urgency
2. Low-confidence topics
3. Topic importance
4. Revision
5. Practice

Never overload the student.

Plans should be realistic and achievable.

Return only valid JSON matching the required schema.

When feedback indicates difficulty, increase future exposure to that topic while reducing lower-priority work if necessary.

When feedback indicates mastery, reduce repeated learning time and move toward practice/revision.

---

# 13. DATABASE

## users

id
name
created_at

## plans

id
user_id
exam_date
hours_per_day
plan_json
created_at

## sessions

id
plan_id
subject
topic
duration
status
feedback
date

---

# 14. DESIGN SYSTEM

Lucent should feel:

- minimal
- calm
- intelligent
- warm
- editorial
- premium
- human
- focused
- slightly playful
- never childish

Avoid:

- generic AI SaaS appearance
- excessive gradients
- excessive glassmorphism
- excessive shadows
- neon colors
- overly rounded everything
- robot imagery
- unnecessary dashboards
- excessive animations

Use:

- strong typography
- generous whitespace
- warm neutral background
- subtle borders
- restrained accent color
- clear hierarchy
- short human copy

---

# 15. UI SCREENS

## Landing

Headline:

"Bring the hidden to light."

Subheadline:

"A study plan that learns from you."

CTA:

"Build my plan"

---

## Setup

Collect:

- exam date
- subjects
- topics
- available hours
- confidence

Keep the form short.

---

## Plan

Display:

- days remaining
- hours today
- progress
- study sessions
- topic
- activity
- duration

---

## Session

Display:

- subject
- topic
- activity
- duration
- start button

---

## Feedback

Ask:

"How did that feel?"

Options:

"Got it"

"Need more practice"

"I'm stuck"

---

## Adaptation

Show:

"Lucent noticed."

Then explain:

"Probability needs more attention, so tomorrow's plan has been adjusted."

Visually compare before and after plans.

---

# 16. UX PRINCIPLES

Every screen should answer one question.

Landing:

"What is Lucent?"

Setup:

"What does Lucent need from me?"

Plan:

"What should I study?"

Session:

"What am I doing right now?"

Feedback:

"How did I perform?"

Adaptation:

"What changed and why?"

---

# 17. PERFORMANCE

Prioritize:

- fast initial load
- fast plan generation
- loading states
- graceful API errors
- mobile responsiveness

AI generation should have a clear loading state.

Example:

"Building your plan..."

---

# 18. ERROR HANDLING

If AI fails:

Show:

"Lucent couldn't build your plan right now. Try again."

Do not expose API errors.

If data is missing:

Show friendly validation.

Never show blank screens.

---

# 19. DEMO DATA

Use:

Exam:

7 days away

Available time:

3 hours/day

Subjects:

Mathematics

Topics:

Probability
Calculus
Algebra

Confidence:

Probability = Low
Calculus = Medium
Algebra = High

Demo feedback:

Probability = struggled

Expected adaptation:

Probability receives more time.

---

# 20. HACKATHON PRIORITIES

Priority 1:

Adaptive planning works.

Priority 2:

AI generates useful structured plans.

Priority 3:

Feedback changes future plans.

Priority 4:

UI is polished.

Priority 5:

Data persistence.

Everything else is optional.

---

# 21. DO NOT BUILD FOR MVP

Do not implement:

- chatbot
- RAG
- vector database
- multi-agent architecture
- social network
- leaderboard
- complex authentication
- notifications
- calendar integrations
- mobile application
- advanced analytics
- complicated gamification

---

# 22. SUCCESS CRITERIA

The MVP is successful if a judge can understand the product within 30 seconds.

The complete demo should take less than 3 minutes.

The judge should see:

INPUT → AI PLAN → STUDY → FEEDBACK → ADAPTATION

The adaptation must be visually obvious.

---

# 23. DEVELOPMENT PRINCIPLE

When choosing between:

A) technically sophisticated implementation

and

B) simple implementation that works reliably

Choose B.

This is a 6-hour hackathon MVP.

Reliability > architecture.

User experience > feature count.

One excellent flow > ten unfinished features.

---

# 24. FUTURE VISION

Future versions may include:

- syllabus/PDF ingestion
- AI tutor
- automatic question generation
- spaced repetition
- calendar integration
- exam analytics
- focus tracking
- voice interaction
- long-term learning memory
- personalized learning patterns

These are NOT part of the MVP.

---

# 25. CORE MESSAGE

Lucent does not ask:

"What is your ideal study schedule?"

Lucent asks:

"What can you realistically do, and how are you actually doing?"

Then it adapts.

PLAN → STUDY → FEEDBACK → ADAPT

That is Lucent.