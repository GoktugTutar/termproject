#!/usr/bin/env node
/**
 * Database Seed Script
 * Usage: node seed.js [--base-url http://localhost:3000]
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3000';

// ── Seed Data ────────────────────────────────────────────────────────────────

const USERS = [
  {
    email: 'ahmet@test.com',
    password: 'test123',
    profile: {
      name: 'Ahmet Yılmaz',
      gpa: 3.2,
      semester: 5,
      stressLevel: 3,
      busyTimes: {
        Monday:    { '09:00-10:00': 'Class', '14:00-16:00': 'Gym' },
        Wednesday: { '09:00-10:00': 'Class' },
        Friday:    { '13:00-15:00': 'Part-time job' },
      },
    },
    lessons: [
      {
        name: 'Calculus II',
        credit: 4,
        difficulty: 4,
        semester: 5,
        vizeDate: '2026-04-15T10:00:00.000Z',
        finalDate: '2026-06-10T10:00:00.000Z',
        homeworkDeadlines: ['2026-04-01T23:59:00.000Z', '2026-04-22T23:59:00.000Z'],
      },
      {
        name: 'Data Structures',
        credit: 3,
        difficulty: 3.5,
        semester: 5,
        vizeDate: '2026-04-18T13:00:00.000Z',
        finalDate: '2026-06-13T13:00:00.000Z',
        homeworkDeadlines: ['2026-04-05T23:59:00.000Z', '2026-05-01T23:59:00.000Z'],
      },
      {
        name: 'Operating Systems',
        credit: 3,
        difficulty: 4.5,
        semester: 5,
        vizeDate: '2026-04-20T09:00:00.000Z',
        finalDate: '2026-06-15T09:00:00.000Z',
        homeworkDeadlines: ['2026-04-10T23:59:00.000Z'],
      },
      {
        name: 'Technical English',
        credit: 2,
        difficulty: 1.5,
        semester: 5,
        vizeDate: '2026-04-25T11:00:00.000Z',
        finalDate: '2026-06-18T11:00:00.000Z',
        homeworkDeadlines: [],
      },
    ],
  },
  {
    email: 'zeynep@test.com',
    password: 'test123',
    profile: {
      name: 'Zeynep Kaya',
      gpa: 3.7,
      semester: 3,
      stressLevel: 2,
      busyTimes: {
        Tuesday:  { '10:00-12:00': 'Club Meeting' },
        Thursday: { '15:00-17:00': 'Library' },
        Saturday: { '10:00-14:00': 'Internship' },
      },
    },
    lessons: [
      {
        name: 'Linear Algebra',
        credit: 4,
        difficulty: 3.5,
        semester: 3,
        vizeDate: '2026-04-14T09:00:00.000Z',
        finalDate: '2026-06-09T09:00:00.000Z',
        homeworkDeadlines: ['2026-04-07T23:59:00.000Z', '2026-04-28T23:59:00.000Z'],
      },
      {
        name: 'Discrete Mathematics',
        credit: 3,
        difficulty: 4,
        semester: 3,
        vizeDate: '2026-04-17T11:00:00.000Z',
        finalDate: '2026-06-12T11:00:00.000Z',
        homeworkDeadlines: ['2026-04-03T23:59:00.000Z'],
      },
      {
        name: 'Introduction to Programming',
        credit: 4,
        difficulty: 2,
        semester: 3,
        vizeDate: '2026-04-16T14:00:00.000Z',
        finalDate: '2026-06-11T14:00:00.000Z',
        homeworkDeadlines: ['2026-04-06T23:59:00.000Z', '2026-04-20T23:59:00.000Z', '2026-05-04T23:59:00.000Z'],
      },
    ],
  },
  {
    email: 'mert@test.com',
    password: 'test123',
    profile: {
      name: 'Mert Demir',
      gpa: 2.5,
      semester: 7,
      stressLevel: 5,
      busyTimes: {
        Monday:    { '18:00-22:00': 'Work' },
        Tuesday:   { '18:00-22:00': 'Work' },
        Wednesday: { '18:00-22:00': 'Work' },
        Thursday:  { '18:00-22:00': 'Work' },
        Friday:    { '18:00-22:00': 'Work' },
      },
    },
    lessons: [
      {
        name: 'Software Engineering',
        credit: 3,
        difficulty: 3,
        semester: 7,
        vizeDate: '2026-04-19T10:00:00.000Z',
        finalDate: '2026-06-14T10:00:00.000Z',
        homeworkDeadlines: ['2026-04-12T23:59:00.000Z', '2026-05-10T23:59:00.000Z'],
      },
      {
        name: 'Database Management',
        credit: 3,
        difficulty: 3.5,
        semester: 7,
        vizeDate: '2026-04-21T13:00:00.000Z',
        finalDate: '2026-06-16T13:00:00.000Z',
        homeworkDeadlines: ['2026-04-14T23:59:00.000Z'],
      },
      {
        name: 'Computer Networks',
        credit: 3,
        difficulty: 4,
        semester: 7,
        vizeDate: '2026-04-23T09:00:00.000Z',
        finalDate: '2026-06-17T09:00:00.000Z',
        homeworkDeadlines: [],
      },
      {
        name: 'Graduation Project I',
        credit: 2,
        difficulty: 5,
        semester: 7,
        vizeDate: null,
        finalDate: '2026-06-20T10:00:00.000Z',
        homeworkDeadlines: ['2026-04-30T23:59:00.000Z', '2026-05-31T23:59:00.000Z'],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Seed script  →  ${BASE_URL}`);
  console.log(`${'─'.repeat(55)}\n`);

  const results = [];

  for (const user of USERS) {
    console.log(`👤 Processing user: ${user.email}`);

    // 1. Register
    let token;
    try {
      const reg = await request('POST', '/auth/register', {
        email: user.email,
        password: user.password,
      });
      token = reg.access_token;
      log('✅', `Registered  →  ${user.email}`);
    } catch (err) {
      // Already exists — try login instead
      if (err.message.includes('409') || err.message.includes('already')) {
        log('⚠️', `Already exists, logging in  →  ${user.email}`);
        const login = await request('POST', '/auth/login', {
          email: user.email,
          password: user.password,
        });
        token = login.access_token;
        log('✅', `Logged in   →  ${user.email}`);
      } else {
        log('❌', `Register failed: ${err.message}`);
        continue;
      }
    }

    // 2. Update profile
    try {
      await request('PUT', '/person/update', user.profile, token);
      log('✅', `Profile updated  →  ${user.profile.name}`);
    } catch (err) {
      log('❌', `Profile update failed: ${err.message}`);
    }

    // 3. Register lessons (single batch call)
    try {
      const created = await request('POST', '/lesson/register', user.lessons, token);
      log('✅', `Lessons created (${created.length}):`);
      created.forEach(l => console.log(`      • ${l.name}  [difficulty: ${l.difficulty}, credit: ${l.credit}]`));
      results.push({ email: user.email, token, lessons: created.length });
    } catch (err) {
      log('❌', `Lesson register failed: ${err.message}`);
      results.push({ email: user.email, token, lessons: 0 });
    }

    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(55)}`);
  console.log('  SUMMARY');
  console.log(`${'─'.repeat(55)}`);
  results.forEach(r => {
    console.log(`  ${r.email.padEnd(22)}  lessons: ${r.lessons}  token: ${r.token.slice(0, 30)}...`);
  });
  console.log(`${'─'.repeat(55)}\n`);

  console.log('Test credentials:');
  USERS.forEach(u => console.log(`  email: ${u.email}   password: ${u.password}`));
  console.log();
}

seed().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
