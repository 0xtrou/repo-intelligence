import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  appendRunRecord,
  assertValidTarget,
  countRecords,
  listTargets,
  loadPlan,
  loadRunRecords,
  runsFileFor,
  savePlan,
} from './store';
import { RunRecord, SCHEMA_VERSION } from './types';

// sandbox the store away from real history before any store call (env is read lazily per call)
process.env.RI_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ri-store-test-'));

function record(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    target: 'test-target',
    tool: 'unit-test',
    capturedAt: new Date().toISOString(),
    metrics: { 'workflow.rework.loops': 1 },
    ...overrides,
  };
}

test('assertValidTarget rejects path traversal and bad ids, accepts hierarchy', () => {
  assert.throws(() => assertValidTarget('../evil'));
  assert.throws(() => assertValidTarget('a/../b'));
  assert.throws(() => assertValidTarget('a//b'));
  assert.throws(() => assertValidTarget('x/'));
  assert.throws(() => assertValidTarget('/x'));
  assert.throws(() => assertValidTarget('.'));
  assert.doesNotThrow(() => assertValidTarget('my-app.v1'));
  assert.doesNotThrow(() => assertValidTarget('parent/child'));
  assert.doesNotThrow(() => assertValidTarget('opencode/packages-tui'));
});

test('appendRunRecord appends without truncating existing history', () => {
  const first = appendRunRecord(record());
  assert.equal(first.recordNumber, 1);
  const second = appendRunRecord(record({ metrics: { 'workflow.rework.loops': 2 } }));
  assert.equal(second.recordNumber, 2);
  assert.equal(second.file, first.file);
  assert.equal(countRecords('test-target'), 2);
});

test('loadRunRecords round-trips appended records in order', () => {
  const records = loadRunRecords('test-target');
  assert.equal(records.length, 2);
  assert.equal(records[0]?.metrics['workflow.rework.loops'], 1);
  assert.equal(records[1]?.metrics['workflow.rework.loops'], 2);
});

test('loadRunRecords throws on corrupted history instead of skipping silently', () => {
  fs.appendFileSync(runsFileFor('corrupt-target'), '{not json}\n', 'utf8');
  assert.throws(() => loadRunRecords('corrupt-target'), /history is corrupted/);
});

test('listTargets discovers appended targets sorted', () => {
  assert.ok(listTargets().includes('test-target'));
  assert.ok(listTargets().includes('corrupt-target'));
});

test('savePlan / loadPlan round-trip under plans/', () => {
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    target: 'plan-target',
    createdAt: new Date().toISOString(),
    status: 'confirmed' as const,
    tooling: [],
    metrics: [],
  };
  const file = savePlan(plan);
  assert.ok(file.endsWith('plan-target.plan.json'));
  assert.equal(loadPlan('plan-target')?.status, 'confirmed');
  assert.equal(loadPlan('never-planned'), null);
});

test('hierarchical targets nest under runs/ and plans/', () => {
  const first = appendRunRecord(record({ target: 'parent/child' }));
  assert.ok(first.file.endsWith(`runs${path.sep}parent${path.sep}child.jsonl`));
  const second = appendRunRecord(record({ target: 'parent/child', metrics: { 'workflow.rework.loops': 3 } }));
  assert.equal(second.recordNumber, 2);

  const records = loadRunRecords('parent/child');
  assert.equal(records.length, 2);
  assert.ok(listTargets().includes('parent/child'));

  const plan = {
    schemaVersion: SCHEMA_VERSION,
    target: 'parent/child',
    createdAt: new Date().toISOString(),
    status: 'draft' as const,
    tooling: [],
    metrics: [],
  };
  assert.ok(savePlan(plan).includes(`plans${path.sep}parent${path.sep}child.plan.json`));
  assert.equal(loadPlan('parent/child')?.target, 'parent/child');
});
