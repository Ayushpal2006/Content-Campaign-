import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

for (const queued of [false, true]) test(`${queued ? 'Queued' : 'Direct'} actions isolate video locks and late completions`, async () => {
  const source = readFileSync('src/components/VideoDetailDrawer.astro', 'utf8');
  const fn = queued ? 'runQueuedManagerAction' : 'runManagerAction';
  const start = source.indexOf(`  async function ${fn}(`);
  const end = source.indexOf(queued ? '  function saveManagerScript(' : '  async function runQueuedManagerAction(', start);
  const requests = [], reopened = [], invalidated = [];
  const context = vm.createContext({
    document: { getElementById: () => null },
    crypto: { randomUUID: () => String(requests.length) },
    window: {},
    setTimeout: callback => { callback(); return 1; },
    startManagerActionProgress() {}, finishManagerActionProgress() {}, showToast() {},
    managerErrorMessage: (_, fallback) => fallback,
    videoDetailCache: { delete: id => invalidated.push(id) },
    openVideoDrawer: id => reopened.push(id),
    fetch: (_, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'job_status') return Promise.resolve({ ok: true, json: async () => ({ status: 'Completed' }) });
      return new Promise(resolve => requests.push({ body, resolve }));
    },
  });
  vm.runInContext('let activeSelectedVideoId = "A"; const managerActionsByVideo = new Set();' + source.slice(start, end), context);
  const first = vm.runInContext(`${fn}("qc_approve", {}, "Approved")`, context);
  await vm.runInContext(`${fn}("qc_approve", {}, "Approved")`, context);
  assert.equal(requests.length, 1, 'duplicate A must be blocked');
  const second = vm.runInContext(`activeSelectedVideoId = "B"; ${fn}("qc_approve", {}, "Approved")`, context);
  assert.deepEqual(requests.map(r => r.body.videoId), ['A', 'B']);
  requests[0].resolve({ ok: true, json: async () => ({ ok: true, jobId: 'job-A' }) });
  await first;
  assert.deepEqual(reopened, [], 'A completion must not reopen B');
  requests[1].resolve({ ok: true, json: async () => ({ ok: true, jobId: 'job-B' }) });
  await second;
  assert.deepEqual(reopened, ['B']);
  assert.deepEqual(invalidated, ['A', 'B']);
});
