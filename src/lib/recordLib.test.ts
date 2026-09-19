import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMetrics, ISO_RE, METRIC_ID_RE, validateMetrics } from './recordLib';

test('METRIC_ID_RE accepts the canonical vocabulary (camelCase segments, lowercase domains)', () => {
  for (const id of ['runtime.lcpMs', 'workflow.gate.passRate', 'a11y.violations', 'workflow.rework.loops']) {
    assert.ok(METRIC_ID_RE.test(id), `${id} should match`);
  }
});

test('METRIC_ID_RE rejects non-dot-notation and uppercase-domain ids', () => {
  for (const id of ['lcpMs', 'Bad_Id', 'runtime.', '.hidden', 'runtime.LCP', 'runtime.lcp ms']) {
    assert.ok(!METRIC_ID_RE.test(id), `${id} should NOT match`);
  }
});

test('ISO_RE accepts ISO 8601 with Z or offset, rejects loose dates', () => {
  assert.ok(ISO_RE.test('2026-09-19T04:01:16.323Z'));
  assert.ok(ISO_RE.test('2026-09-19T04:01:16+07:00'));
  assert.ok(!ISO_RE.test('2026-09-19'));
  assert.ok(!ISO_RE.test('yesterday'));
});

test('extractMetrics unwraps the {"metrics": {...}} shape', () => {
  const out = extractMetrics({ metrics: { 'runtime.lcpMs': 1200 } });
  assert.deepEqual(out, { 'runtime.lcpMs': 1200 });
});

test('extractMetrics treats a bare map as metrics, excluding wrapper fields', () => {
  const out = extractMetrics({ tool: 'x', notes: 'n', 'runtime.lcpMs': 900, ok: true });
  assert.deepEqual(out, { 'runtime.lcpMs': 900, ok: true });
});

test('validateMetrics passes clean records', () => {
  const { metrics, errors } = validateMetrics({ metrics: { 'runtime.lcpMs': 1200, 'gate.passed': false } });
  assert.deepEqual(errors, []);
  assert.deepEqual(metrics, { 'runtime.lcpMs': 1200, 'gate.passed': false });
});

test('validateMetrics rejects bad ids, strings, NaN and Infinity — history stays clean', () => {
  const { errors } = validateMetrics({
    metrics: { 'Bad_Id': 1, 'runtime.ok': 'fast', 'runtime.nan': Number.NaN, 'runtime.inf': Number.POSITIVE_INFINITY },
  });
  // 4 field errors + "record has no valid metrics" (nothing survived validation)
  assert.equal(errors.length, 5);
  assert.ok(errors.some((e) => e.includes('Bad_Id')));
  assert.ok(errors.some((e) => e.includes('no valid metrics')));
});

test('validateMetrics still records the valid subset when errors are present elsewhere', () => {
  const { metrics, errors } = validateMetrics({ metrics: { 'runtime.lcpMs': 1200, 'Bad_Id': 1 } });
  assert.equal(errors.length, 1);
  assert.deepEqual(metrics, { 'runtime.lcpMs': 1200 });
});
