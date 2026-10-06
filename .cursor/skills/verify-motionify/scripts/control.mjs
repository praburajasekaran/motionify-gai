#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const script = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(script), '../../../..');
const [command, runArg, feature = 'quiz'] = process.argv.slice(2);
const runs = path.join(root, '.scratch/verify-motionify/runs');
const run = path.resolve(root, runArg || '.');
if (!run.startsWith(`${runs}${path.sep}`) || run === runs) {
  throw new Error('Run directory must be a child of .scratch/verify-motionify/runs/');
}
const evidence = path.join(run, 'evidence');
const runtime = path.join(run, 'runtime');
const statePath = path.join(run, 'instance.json');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const readState = () => JSON.parse(readFileSync(statePath, 'utf8'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceDigest() {
  const files = git('ls-files', '-z').split('\0').filter((file) => file && !file.startsWith('.cursor/')
    && (file.startsWith('public/') || /\.(tsx?|css|html|[cm]?js|json)$/.test(file)));
  files.push('.env', '.env.local', '.env.production', '.env.production.local');
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    hash.update(file);
    hash.update(existsSync(path.join(root, file)) ? readFileSync(path.join(root, file)) : 'missing');
  }
  return hash.digest('hex');
}

function ownerAlive(state) {
  if (state.root !== root || state.run !== run || state.pid < 2) throw new Error('Invalid ownership record');
  try {
    const args = execFileSync('ps', ['-p', String(state.pid), '-o', 'args='], { encoding: 'utf8' });
    if (!args.includes(script) || !args.includes(`serve ${run}`)) throw new Error('PID belongs to another command');
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

async function doctor() {
  const state = readState();
  if (!ownerAlive(state)) throw new Error('Owned preview process is no longer running');
  if (state.revision !== git('rev-parse', 'HEAD')) throw new Error('HEAD changed; launch a fresh build');
  if (state.sourceSha256 !== sourceDigest()) throw new Error('Source or build environment changed; launch a fresh build');
  const response = await fetch(state.url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok || digest(await response.text()) !== state.indexSha256) {
    throw new Error('Port does not serve this run’s built index.html');
  }
  return { ...state, status: 'ready', profile: 'frontend-only; API proxy disabled; no backend credentials required' };
}

async function cleanup() {
  if (existsSync(statePath)) {
    const state = readState();
    if (ownerAlive(state)) {
      process.kill(state.pid, 'SIGTERM');
      for (let count = 0; count < 50 && ownerAlive(state); count++) await sleep(100);
      if (ownerAlive(state)) throw new Error('Owned server did not stop; runtime retained for diagnosis');
    }
    const stopped = { ...state, stoppedAt: new Date().toISOString() };
    writeFileSync(statePath, JSON.stringify(stopped, null, 2));
  }
  rmSync(runtime, { recursive: true, force: true });
  const result = { stopped: true, evidenceRetained: evidence, runtimeRemoved: !existsSync(runtime) };
  if (existsSync(evidence)) writeFileSync(path.join(evidence, 'cleanup.json'), JSON.stringify(result, null, 2));
  return result;
}

async function serve() {
  const { preview } = await import('vite');
  const state = readState();
  const server = await preview({
    root,
    build: { outDir: path.join(runtime, 'dist') },
    preview: { host: '127.0.0.1', port: state.port, strictPort: true, proxy: {}, open: false },
  });
  writeFileSync(path.join(runtime, 'ready'), 'ready');
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await new Promise((resolve) => server.httpServer.close(resolve));
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

async function launch() {
  if (existsSync(run)) throw new Error('Run directory already exists; choose a new run ID (proof is never overwritten)');
  mkdirSync(evidence, { recursive: true });
  mkdirSync(runtime);
  const outDir = path.join(runtime, 'dist');
  const sourceSha256 = sourceDigest();
  const buildLog = openSync(path.join(evidence, 'build.log'), 'w');
  const built = spawnSync('rtk', ['npm', 'run', 'build', '--', '--outDir', outDir, '--emptyOutDir'], {
    cwd: root, stdio: ['ignore', buildLog, buildLog],
  });
  closeSync(buildLog);
  if (built.error || built.status !== 0) throw new Error('Build failed; see evidence/build.log');
  if (sourceSha256 !== sourceDigest()) throw new Error('Source changed during build; launch a fresh run');
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const state = {
    root, run, port, url: `http://127.0.0.1:${port}`, revision: git('rev-parse', 'HEAD'),
    indexSha256: digest(readFileSync(path.join(outDir, 'index.html'))), sourceSha256,
    startedAt: new Date().toISOString(), pid: null,
  };
  writeFileSync(path.join(evidence, 'source-status.txt'), git('status', '--short'));
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  const serverLog = openSync(path.join(evidence, 'server.log'), 'w');
  const child = spawn(process.execPath, [script, 'serve', run], {
    cwd: root, detached: true, stdio: ['ignore', serverLog, serverLog],
  });
  closeSync(serverLog);
  state.pid = child.pid;
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  child.unref();
  for (let count = 0; count < 150; count++) {
    if (!ownerAlive(state)) throw new Error('Preview exited; see evidence/server.log');
    if (existsSync(path.join(runtime, 'ready'))) return doctor();
    await sleep(100);
  }
  throw new Error('Preview did not become ready in 15 seconds');
}

async function drive() {
  if (!['work', 'quiz', 'portal-entry'].includes(feature)) throw new Error('Features: work, quiz, portal-entry');
  const state = await doctor();
  const proof = path.join(evidence, feature);
  if (existsSync(proof)) throw new Error('Feature proof already exists; launch a new run for a retry');
  mkdirSync(proof);
  const require = createRequire(path.join(root, 'package.json'));
  const cli = require.resolve('@playwright/test/cli');
  const log = openSync(path.join(proof, 'playwright.log'), 'w');
  const result = spawnSync('rtk', ['node', cli, 'test', '--config', path.join(path.dirname(script), 'playwright.config.mjs'), '--grep', `${feature}$`], {
    cwd: root,
    env: { ...process.env, VERIFY_URL: state.url, VERIFY_PROOF: proof },
    stdio: ['ignore', log, log],
  });
  closeSync(log);
  if (result.error || result.status !== 0) throw new Error(`Drive failed; see ${proof}/playwright.log`);
  return { feature, status: 'passed', evidence: proof };
}

try {
  let result;
  if (command === 'launch') result = await launch();
  else if (command === 'serve') await serve();
  else if (command === 'doctor') {
    result = await doctor();
    writeFileSync(path.join(evidence, 'doctor.json'), JSON.stringify(result, null, 2));
  } else if (command === 'drive') result = await drive();
  else if (command === 'cleanup') result = await cleanup();
  else throw new Error('Usage: control.mjs launch|doctor|drive|cleanup RUN_DIR [work|quiz|portal-entry]');
  if (result) console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  if (command === 'launch' || command === 'drive') {
    try { console.error(JSON.stringify(await cleanup())); }
    catch (cleanupError) { console.error(`Cleanup failed: ${cleanupError.message}`); }
  }
  process.exitCode = 1;
}
