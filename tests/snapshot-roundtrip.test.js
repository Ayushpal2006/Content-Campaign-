import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { gzipSync, gunzipSync } from 'node:zlib';

test('snapshot reader decompresses split payload with explicit gzip MIME type', () => {
  const payload = { videos: [{ videoId: 'TEST-1', notes: 'हिंदी revision' }] };
  const encoded = gzipSync(JSON.stringify(payload)).toString('base64');
  const date = new Date('2026-09-07T12:00:00Z');
  const rows = [
    ['videos', 2, 2, date, encoded.slice(20)],
    ['videos', 1, 2, date, encoded.slice(0, 20)],
  ];
  const context = vm.createContext({ Date, Utilities: {
    base64Decode: value => Buffer.from(value, 'base64'),
    newBlob: (bytes, mime, name) => {
      assert.equal(mime, 'application/gzip');
      assert.equal(name, 'videos.json.gz');
      return bytes;
    },
    ungzip: bytes => ({ getDataAsString: encoding => {
      assert.equal(encoding, 'UTF-8');
      return gunzipSync(bytes).toString('utf8');
    } }),
  } });
  vm.runInContext(readFileSync('apps-script/web-snapshot-addon.js', 'utf8'), context);
  const sheet = { getLastRow: () => 3, getRange: () => ({ getValues: () => rows }) };
  const result = context.webSnapshotFromSheet_(sheet, 'videos');
  assert.equal(JSON.stringify(result.data), JSON.stringify(payload));
  assert.equal(result.generatedAt, date.toISOString());
});
