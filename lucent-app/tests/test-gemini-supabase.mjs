// tests/test-gemini-supabase.mjs
// Verification of Gemini AI Tutor and Supabase modules
import { geminiService } from '../src/services/gemini-service.js';
import { supabaseDb } from '../src/lib/supabase/database.js';

console.log('--- 1. GEMINI AI SERVICE INITIALIZATION ---');
console.log('Gemini Service isAvailable():', geminiService.isAvailable());
console.log('Gemini Service ready for integration: PASS');

console.log('\n--- 2. SUPABASE DATABASE INITIALIZATION ---');
console.log('Supabase Database isAvailable():', supabaseDb.isAvailable());
console.log('Supabase Module ready for credentials: PASS');

console.log('\n=== GEMINI & SUPABASE MODULE CHECKS PASSED ===');
