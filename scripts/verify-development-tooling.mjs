import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createIPX, ipxFSStorage } from 'ipx';

const directory = await mkdtemp(path.join(tmpdir(), 'motionify-tooling-'));
let csvRequests = 0;
const server = http.createServer((request, response) => {
  if (request.url === '/csv/local') csvRequests++;
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end('<title>Tooling smoke</title><h1>Local tooling works</h1>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

async function runArtillery(name, config) {
  const filename = path.join(directory, `${name}.json`);
  const output = path.join(directory, `${name}-result.json`);
  await writeFile(filename, JSON.stringify(config));
  const child = spawn(process.execPath, ['node_modules/artillery/bin/run', 'run', filename, '--output', output], {
    env: { ...process.env, ARTILLERY_DISABLE_TELEMETRY: 'true' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', data => { log += data; });
  child.stderr.on('data', data => { log += data; });
  const timeout = setTimeout(() => child.kill('SIGTERM'), 60_000);
  try {
    const code = await new Promise(resolve => child.on('exit', resolve));
    assert.equal(code, 0, log);
    const report = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(report.aggregate.counters['vusers.completed'], 1, log);
    assert.equal(report.aggregate.counters['vusers.failed'], 0, log);
    return report.aggregate.counters;
  } finally {
    clearTimeout(timeout);
  }
}

try {
  const image = await createIPX({ storage: ipxFSStorage({ dir: 'public' }) })('motionify-studio-dark.png', { w: '16', f: 'png' }).process();
  assert.equal(image.format, 'png');
  assert(Buffer.isBuffer(image.data));
  assert.equal(image.data.readUInt32BE(16), 16);
  await writeFile(path.join(directory, 'payload.csv'), 'name\nlocal\n');
  const base = { target: origin, phases: [{ duration: 1, arrivalCount: 1 }] };
  const counters = await runArtillery('csv', {
    config: { ...base, payload: { path: 'payload.csv', fields: ['name'], skipHeader: true } },
    scenarios: [{ flow: [{ get: { url: '/csv/{{ name }}' } }] }],
  });
  assert.equal(counters['http.codes.200'], 1);
  assert.equal(csvRequests, 1);
  await writeFile(path.join(directory, 'browser.cjs'), `exports.smoke = async function(page, context) {
    await page.goto(context.vars.target);
    const heading = await page.getByRole('heading').innerText();
    if (heading !== 'Local tooling works') throw new Error('Browser engine did not load the page');
  };`);
  await runArtillery('browser', {
    config: { ...base, engines: { playwright: {} }, processor: 'browser.cjs' },
    scenarios: [{ engine: 'playwright', flowFunction: 'smoke' }],
  });
  console.log('IPX image conversion, Artillery CSV payload, and Artillery browser engine passed.');
} finally {
  await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
