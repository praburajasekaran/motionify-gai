#!/usr/bin/env node
/**
 * PROD-05 Task Management UAT Test Runner
 * Tests task CRUD, state machine, and permissions
 */

import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = 'http://localhost:8888/.netlify/functions';
const PROJECT_ID = 'c0d3d714-440a-4578-baee-7dfc0d780436';

// JWT Configuration (must match server)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not set in .env file');
  process.exit(1);
}
const JWT_ISSUER = 'motionify-platform';
const JWT_AUDIENCE = 'motionify-users';

// Test users
const ADMIN_USER = {
  id: 'f81e3f1c-218d-4a61-a607-f1e7fb8d1479',
  email: 'sarah@motionify.com',
  role: 'super_admin',
  fullName: 'Sarah Chen'
};

const CLIENT_USER = {
  id: 'e1e1e3de-fae9-4684-8bab-2fb03826029e',
  email: 'mike@techcorp.com',
  role: 'client',
  fullName: 'Mike Ross'
};

// Generate JWT token
function generateTestJWT(user) {
  const payload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    fullName: user.fullName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: '1h'
  });
}

// Generate tokens
const ADMIN_TOKEN = generateTestJWT(ADMIN_USER);
const CLIENT_TOKEN = generateTestJWT(CLIENT_USER);

// Test results collector
const results = [];

async function logResult(testId, name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${testId}: ${name}`);
  if (details) console.log(`   Details: ${details}`);
  results.push({ testId, name, passed, details });
}

// Helper to make authenticated API calls
async function apiCall(method, path, body = null, useClientAuth = false) {
  const token = useClientAuth ? CLIENT_TOKEN : ADMIN_TOKEN;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      'Cookie': `auth_token=${token}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data, ok: response.ok };
}

// ============================================================================
// TASK-01: Task Creation Tests
// ============================================================================

async function testT01_01_AdminCreatesTask() {
  const testId = 'T01-01';
  try {
    // DON'T specify status - let backend use default 'pending'
    // BUG: Schema uses wrong enum values (see PROD-05-UAT-RESULTS.md)
    const res = await apiCall('POST', '/tasks', {
      projectId: PROJECT_ID,
      title: `UAT Test Task ${Date.now()}`,
      description: 'Created by automated UAT test',
      // status: omitted to use backend default 'pending'
      visible_to_client: true
    });

    if (res.status === 201 && res.data.id) {
      await logResult(testId, 'Admin creates task manually', true, `Created task: ${res.data.id}, status: ${res.data.status}`);
      return res.data.id; // Return for later tests
    } else {
      await logResult(testId, 'Admin creates task manually', false, `Status: ${res.status}, Error: ${JSON.stringify(res.data)}`);
      return null;
    }
  } catch (err) {
    await logResult(testId, 'Admin creates task manually', false, err.message);
    return null;
  }
}

async function testT01_05_RequiredFieldValidation() {
  const testId = 'T01-05';
  try {
    // Try to create task without title
    const res = await apiCall('POST', '/tasks', {
      projectId: PROJECT_ID,
      description: 'No title'
    });

    if (res.status === 400) {
      await logResult(testId, 'Required field validation (no title)', true, 'Correctly rejected');
    } else {
      await logResult(testId, 'Required field validation (no title)', false, `Expected 400, got ${res.status}`);
    }
  } catch (err) {
    await logResult(testId, 'Required field validation (no title)', false, err.message);
  }
}

// ============================================================================
// TASK-03: State Machine Tests
// ============================================================================

async function testT03_01_PendingToInProgress(taskId) {
  const testId = 'T03-01';
  try {
    // 'in_progress' is in BOTH schema and database - this should work!
    const res = await apiCall('PATCH', `/tasks/${taskId}`, {
      status: 'in_progress'
    });

    if (res.ok && res.data.status === 'in_progress') {
      await logResult(testId, 'PENDING → IN_PROGRESS', true);
      return true;
    } else {
      await logResult(testId, 'PENDING → IN_PROGRESS', false, `Status: ${res.status}, Data: ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (err) {
    await logResult(testId, 'PENDING → IN_PROGRESS', false, err.message);
    return false;
  }
}

async function testT03_02_InProgressToAwaitingApproval(taskId) {
  const testId = 'T03-02';
  try {
    // Schema now fixed - using correct DB value 'awaiting_approval'
    const res = await apiCall('PATCH', `/tasks/${taskId}`, {
      status: 'awaiting_approval'
    });

    if (res.ok && res.data.status === 'awaiting_approval') {
      await logResult(testId, 'IN_PROGRESS → AWAITING_APPROVAL', true);
      return true;
    } else {
      await logResult(testId, 'IN_PROGRESS → AWAITING_APPROVAL', false,
        `Status: ${res.status}, Data: ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (err) {
    await logResult(testId, 'IN_PROGRESS → AWAITING_APPROVAL', false, err.message);
    return false;
  }
}

async function testT03_03_AwaitingApprovalToCompleted(taskId) {
  const testId = 'T03-03';
  try {
    // Schema now fixed - using correct DB value 'completed'
    const res = await apiCall('PATCH', `/tasks/${taskId}`, {
      status: 'completed'
    });

    if (res.ok && res.data.status === 'completed') {
      await logResult(testId, 'AWAITING_APPROVAL → COMPLETED', true);
      return true;
    } else {
      await logResult(testId, 'AWAITING_APPROVAL → COMPLETED', false,
        `Status: ${res.status}, Data: ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (err) {
    await logResult(testId, 'AWAITING_APPROVAL → COMPLETED', false, err.message);
    return false;
  }
}

async function testT03_06_CompletedToInProgress_Reopen(taskId) {
  const testId = 'T03-06';
  try {
    // First ensure task is completed (schema now supports 'completed')
    const completeRes = await apiCall('PATCH', `/tasks/${taskId}`, { status: 'completed' });

    if (!completeRes.ok) {
      await logResult(testId, 'COMPLETED → IN_PROGRESS (reopen)', false,
        `Could not set task to completed: ${JSON.stringify(completeRes.data)}`);
      return;
    }

    // Try to reopen
    const res = await apiCall('PATCH', `/tasks/${taskId}`, {
      status: 'in_progress'
    });

    // Based on backend code (tasks.ts:36), completed → [] is terminal, so this SHOULD fail
    if (res.status === 400) {
      await logResult(testId, 'COMPLETED → IN_PROGRESS (reopen)', true,
        'Backend correctly rejects reopening (completed is terminal state)');
    } else if (res.ok) {
      await logResult(testId, 'COMPLETED → IN_PROGRESS (reopen)', false,
        'Backend ALLOWS reopening but should NOT (completed: [] in state machine)');
    } else {
      await logResult(testId, 'COMPLETED → IN_PROGRESS (reopen)', false, `Unexpected: ${res.status}`);
    }
  } catch (err) {
    await logResult(testId, 'COMPLETED → IN_PROGRESS (reopen)', false, err.message);
  }
}

async function testT03_07_InvalidTransition_PendingToAwaitingApproval() {
  const testId = 'T03-07';
  try {
    // Create a fresh task (defaults to 'pending')
    const createRes = await apiCall('POST', '/tasks', {
      projectId: PROJECT_ID,
      title: `UAT Invalid Transition Test ${Date.now()}`
      // status omitted - defaults to 'pending'
    });

    if (!createRes.ok) {
      await logResult(testId, 'Invalid: PENDING → AWAITING_APPROVAL', false,
        `Could not create test task: ${JSON.stringify(createRes.data)}`);
      return;
    }

    const taskId = createRes.data.id;

    // Try invalid transition: pending → awaiting_approval (skipping in_progress)
    // Backend state machine: pending → [in_progress, completed] only
    const res = await apiCall('PATCH', `/tasks/${taskId}`, {
      status: 'awaiting_approval' // Skip in_progress - should be invalid per backend
    });

    if (res.status === 400) {
      await logResult(testId, 'Invalid: PENDING → AWAITING_APPROVAL', true, 'Correctly rejected');
    } else if (res.ok) {
      await logResult(testId, 'Invalid: PENDING → AWAITING_APPROVAL', false,
        'Backend allowed invalid transition!');
    } else {
      await logResult(testId, 'Invalid: PENDING → AWAITING_APPROVAL', false,
        `Unexpected: ${res.status}, ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    await logResult(testId, 'Invalid: PENDING → AWAITING_APPROVAL', false, err.message);
  }
}

async function testT03_08_InvalidTransition_CompletedToPending() {
  const testId = 'T03-08';
  try {
    // Use existing completed task
    const existingCompletedTaskId = 'e01eb053-d3cb-4928-818a-08fc838d2f5b';

    const res = await apiCall('PATCH', `/tasks/${existingCompletedTaskId}`, {
      status: 'pending'
    });

    if (res.status === 400) {
      await logResult(testId, 'Invalid: COMPLETED → PENDING', true, 'Correctly rejected');
    } else if (res.ok) {
      await logResult(testId, 'Invalid: COMPLETED → PENDING', false, 'Should have been rejected!');
    } else {
      await logResult(testId, 'Invalid: COMPLETED → PENDING', false, `Unexpected: ${res.status}`);
    }
  } catch (err) {
    await logResult(testId, 'Invalid: COMPLETED → PENDING', false, err.message);
  }
}

// ============================================================================
// TASK-05: Comments Tests
// ============================================================================

async function testT05_01_AddComment(taskId) {
  const testId = 'T05-01';
  try {
    const res = await apiCall('POST', `/tasks/${taskId}/comments`, {
      user_id: 'f81e3f1c-218d-4a61-a607-f1e7fb8d1479', // Sarah Chen
      user_name: 'Sarah Chen',
      content: 'UAT test comment'
    });

    if (res.status === 201 && res.data.id) {
      await logResult(testId, 'Add comment to task', true, `Created comment: ${res.data.id}`);
      return res.data.id;
    } else {
      await logResult(testId, 'Add comment to task', false, `Status: ${res.status}`);
      return null;
    }
  } catch (err) {
    await logResult(testId, 'Add comment to task', false, err.message);
    return null;
  }
}

// ============================================================================
// TASK-06: Permissions Tests
// ============================================================================

async function testT06_01_ClientCannotCreateTask() {
  const testId = 'T06-01';
  try {
    // Use client auth token + client role header
    const res = await apiCall('POST', '/tasks', {
      projectId: PROJECT_ID,
      title: 'Client trying to create task',
      user_role: 'client' // Backend checks this for permission
    }, true); // useClientAuth = true

    if (res.status === 403) {
      await logResult(testId, 'Client cannot create tasks', true, 'Correctly blocked');
    } else {
      await logResult(testId, 'Client cannot create tasks', false, `Expected 403, got ${res.status}. Data: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    await logResult(testId, 'Client cannot create tasks', false, err.message);
  }
}

async function testT06_03_ClientOnlySeesVisibleTasks() {
  const testId = 'T06-03';
  try {
    // Fetch tasks as client (using client auth token)
    const res = await apiCall('GET', `/tasks?projectId=${PROJECT_ID}&userRole=client`, null, true);

    if (res.ok) {
      const tasks = res.data;
      const hasInternalTasks = tasks.some(t => t.visibleToClient === false);

      if (!hasInternalTasks) {
        await logResult(testId, 'Client only sees visible tasks', true, `Found ${tasks.length} visible tasks`);
      } else {
        await logResult(testId, 'Client only sees visible tasks', false, 'Client can see internal tasks!');
      }
    } else {
      await logResult(testId, 'Client only sees visible tasks', false, `Status: ${res.status}`);
    }
  } catch (err) {
    await logResult(testId, 'Client only sees visible tasks', false, err.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PROD-05: Task Management UAT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('--- TASK-01: Task Creation ---');
  const newTaskId = await testT01_01_AdminCreatesTask();
  await testT01_05_RequiredFieldValidation();

  console.log('\n--- TASK-03: State Machine ---');
  if (newTaskId) {
    await testT03_01_PendingToInProgress(newTaskId);
    await testT03_02_InProgressToAwaitingApproval(newTaskId);
    await testT03_03_AwaitingApprovalToCompleted(newTaskId);
  }
  await testT03_06_CompletedToInProgress_Reopen(newTaskId || 'e01eb053-d3cb-4928-818a-08fc838d2f5b');
  await testT03_07_InvalidTransition_PendingToAwaitingApproval();
  await testT03_08_InvalidTransition_CompletedToPending();

  console.log('\n--- TASK-05: Comments ---');
  if (newTaskId) {
    await testT05_01_AddComment(newTaskId);
  }

  console.log('\n--- TASK-06: Permissions ---');
  await testT06_01_ClientCannotCreateTask();
  await testT06_03_ClientOnlySeesVisibleTasks();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testId}: ${r.name}`);
      if (r.details) console.log(`    ${r.details}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════════');
}

runAllTests().catch(console.error);
