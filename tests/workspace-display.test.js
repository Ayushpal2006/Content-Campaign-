import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('workspace loads direct and snapshot envelopes and rejects malformed responses', async () => {
  const source = readFileSync('src/pages/my-work.astro', 'utf8');
  const start = source.indexOf('    async function loadMyWorkData(');
  const end = source.indexOf('    function renderMyWork()', start);
  for (const snapshot of [false, true]) {
    const elements = new Map();
    const list = [{ videoId: 'QC-1', editor: 'Editor A' }];
    let body = { result: { videos: { items: list } } };
    const context = vm.createContext({
      document: { getElementById: id => {
        if (!elements.has(id)) elements.set(id, { style: {}, textContent: '' });
        return elements.get(id);
      } },
      window: snapshot ? { infinitySnapshotCache: { get: () => null, unwrap: () => ({ data: body.result }) } } : {},
      fetch: async () => ({ ok: true, json: async () => body }),
      populatePersonDropdown() {}, renderMyWork() {},
    });
    vm.runInContext('let cachedVideos = [];' + source.slice(start, end), context);
    await vm.runInContext('loadMyWorkData()', context);
    assert.equal(vm.runInContext('cachedVideos[0].videoId', context), 'QC-1');
    body = { result: {} };
    await vm.runInContext('loadMyWorkData(true)', context);
    assert.match(elements.get('my-work-error-text').textContent, /missing the videos list/);
  }
});

test('hidden UI overrides display classes and QC controls precede operational details', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  const drawer = readFileSync('src/components/VideoDetailDrawer.astro', 'utf8');
  assert.ok(drawer.indexOf('id="drawer-qc-notes"') < drawer.indexOf('id="drawer-operational-alert"'));
  assert.equal(drawer.match(/id="drawer-qc-notes"/g).length, 1);
});
