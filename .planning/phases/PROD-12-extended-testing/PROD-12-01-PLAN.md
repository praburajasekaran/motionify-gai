---
phase: PROD-12-extended-testing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - load-tests/api-load.yml
  - load-tests/scenarios/auth-processor.js
  - load-tests/frontend-load.yml
  - load-tests/scenarios/proposal-flow.js
  - package.json
autonomous: true

must_haves:
  truths:
    - "Artillery installed and configured for API load testing"
    - "API load test scenario covers proposals CRUD and read-heavy workloads"
    - "Frontend load test scenario uses Playwright engine for browser-based testing"
    - "Load tests can be executed via npm script"
  artifacts:
    - path: "load-tests/api-load.yml"
      provides: "API load testing configuration with warm-up, ramp-up, and sustained phases"
    - path: "load-tests/scenarios/auth-processor.js"
      provides: "Authentication processor for virtual users"
    - path: "load-tests/frontend-load.yml"
      provides: "Frontend browser-based load testing via Artillery Playwright engine"
    - path: "load-tests/scenarios/proposal-flow.js"
      provides: "Playwright-based proposal browsing scenario"
  key_links:
    - from: "load-tests/api-load.yml"
      to: "load-tests/scenarios/auth-processor.js"
      via: "processor field in Artillery config"
      pattern: "processor:.*auth-processor"
    - from: "load-tests/frontend-load.yml"
      to: "load-tests/scenarios/proposal-flow.js"
      via: "processor field in Artillery config"
      pattern: "processor:.*proposal-flow"
---

<objective>
Set up Artillery load testing infrastructure with API and frontend load test scenarios targeting 100 concurrent users.

Purpose: Validate that API endpoints and frontend handle expected load without degradation, establishing a performance baseline before client demo.
Output: Load test configuration files and npm scripts ready to execute against local or staging environments.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-12-extended-testing/PROD-12-RESEARCH.md
@playwright.config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Artillery and create API load test scenarios</name>
  <files>
    package.json
    load-tests/api-load.yml
    load-tests/scenarios/auth-processor.js
  </files>
  <action>
    1. Install Artillery as dev dependency:
       ```bash
       npm install --save-dev artillery artillery-engine-playwright
       ```

    2. Create `load-tests/` directory at project root.

    3. Create `load-tests/api-load.yml` - API endpoint load testing configuration:
       - Target: `http://localhost:8888/.netlify/functions`
       - Three phases: warm-up (60s, 5 req/s), ramp-up (120s, 5→20 req/s), sustained (300s, 20 req/s)
       - HTTP timeout: 10 seconds
       - Processor: `./scenarios/auth-processor.js`
       - Scenarios:
         a. "Proposal CRUD" (weight 60): POST /proposals with test data, capture proposalId, GET /proposals/{id} - expect 201 and 200
         b. "Read-heavy workload" (weight 40): GET /proposals - expect 200
       - All requests include Cookie header with `auth_token={{ authToken }}`
       - Set `ensure` threshold: p99 response time < 3000ms, max error rate 1%

    4. Create `load-tests/scenarios/auth-processor.js`:
       - Export `beforeScenario` function
       - Authenticate virtual user by calling POST to auth endpoint
       - Store auth token in `userContext.vars.authToken`
       - Use a test user email (e.g., 'admin@motionify.com')

    5. Add npm scripts to package.json:
       - `"test:load:api": "artillery run load-tests/api-load.yml"`
       - `"test:load:frontend": "artillery run load-tests/frontend-load.yml"`
       - `"test:load": "npm run test:load:api"`
  </action>
  <verify>
    Run `npx artillery --version` to confirm Artillery is installed.
    Run `cat load-tests/api-load.yml` to verify YAML is valid and has 3 phases.
    Run `npm run test:load:api -- --count 1` to do a quick smoke test (1 virtual user).
  </verify>
  <done>
    Artillery installed, API load test config created with 3 phases (warm-up, ramp-up, sustained), auth processor wires cookie-based auth, npm scripts added.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create frontend browser-based load test scenario</name>
  <files>
    load-tests/frontend-load.yml
    load-tests/scenarios/proposal-flow.js
  </files>
  <action>
    1. Create `load-tests/frontend-load.yml` - Frontend load testing via Playwright engine:
       - Target: `http://localhost:5173` (Vite dev server) or `http://localhost:8888` (Netlify)
       - Engine: playwright with `aggregateByName: true`
       - Single phase: 120s duration, arrivalRate 5 (lighter than API test - browsers are heavier)
       - Processor: `./scenarios/proposal-flow.js`
       - Scenario: engine playwright, flowFunction "proposalFlowTest", think: 3 (3 second pause between actions)

    2. Create `load-tests/scenarios/proposal-flow.js`:
       - Export `proposalFlowTest` async function receiving (page, userContext, events)
       - Navigate to admin login, perform magic link auth flow if possible, or navigate to proposals page directly
       - Go to `/admin/proposals` and wait for `networkidle`
       - Check if proposal list loaded (look for table or list element)
       - Emit counter: `proposals.viewed`
       - Measure LCP via `page.evaluate` using `performance.getEntriesByType('largest-contentful-paint')`
       - Emit histogram: `proposals.lcp` with LCP value
       - Navigate to a proposal detail if available, wait for networkidle
       - Emit counter: `proposal.detail.viewed`

    Note: Frontend load tests are optional and heavier - they require Playwright browsers. The API load tests are the primary validation tool. Frontend tests provide supplementary browser-level metrics.
  </action>
  <verify>
    Run `cat load-tests/frontend-load.yml` to verify valid YAML with playwright engine config.
    Run `cat load-tests/scenarios/proposal-flow.js` to verify the flow function is exported.
  </verify>
  <done>
    Frontend load test config created with Playwright engine, proposal browsing scenario measures LCP and page load metrics, ready for browser-based load testing.
  </done>
</task>

</tasks>

<verification>
1. `npx artillery --version` returns version 2.x
2. `load-tests/api-load.yml` exists with 3 phases and 2 scenarios
3. `load-tests/frontend-load.yml` exists with playwright engine
4. `npm run test:load:api -- --count 1` completes without config errors
5. Package.json has test:load:api and test:load:frontend scripts
</verification>

<success_criteria>
Load testing infrastructure installed and configured. API load test targets 100 concurrent users with warm-up ramp. Frontend load test uses Playwright engine for browser metrics. Both can be executed via npm scripts.
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-12-extended-testing/PROD-12-01-SUMMARY.md`
</output>
