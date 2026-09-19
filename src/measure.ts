/**
 * Layer 3 — MEASURE. Validates a record against the RunRecord contract and APPENDS it to
 * runs/<target>.jsonl. Append-only by construction: there is no rewrite, no delete.
 * The measure step stamps schemaVersion + capturedAt itself (a file-supplied capturedAt
 * is accepted only via --capturedAt for deliberate backfills).
 *
 * Accepted record-file shapes: {"metrics": {...}} or a bare metric map.
 *
 * Usage: npm run measure -- <target> <record.json> --tool <tool> [--wisdom w] [--fixtures f]
 *                                      [--runId id] [--note text] [--capturedAt <iso>]
 */
import * as fs from 'node:fs';
import { fail, parseArgs } from './lib/cli';
import { appendRunRecord, countRecords, loadPlan } from './lib/store';
import { RunRecord, SCHEMA_VERSION } from './lib/types';

// dot notation, lowercase domains, camelCase segments allowed (e.g. runtime.lcpMs, workflow.gate.passRate)
const METRIC_ID_RE = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

interface MetricsFile {
  metrics?: unknown;
  [k: string]: unknown;
}

function extractMetrics(raw: MetricsFile): Record<string, unknown> {
  if (raw.metrics !== undefined && typeof raw.metrics === 'object' && raw.metrics !== null) {
    return raw.metrics as Record<string, unknown>;
  }
  // bare map: every key that is not a RunRecord wrapper field is a metric
  const wrapper = new Set(['schemaVersion', 'target', 'tool', 'capturedAt', 'wisdom', 'fixtures', 'runId', 'metrics', 'notes']);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!wrapper.has(k)) out[k] = v;
  }
  return out;
}

function main(): void {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const [targetArg, fileArg] = positionals;

  if (targetArg === undefined || fileArg === undefined) {
    fail(
      'missing arguments',
      'usage: npm run measure -- <target> <record.json> --tool <tool> [--wisdom w] [--fixtures f] [--runId id] [--note text] [--capturedAt <iso>]'
    );
  }
  const target = targetArg as string;
  const file = fileArg as string;
  const tool = typeof flags['tool'] === 'string' ? flags['tool'] : undefined;

  if (tool === undefined) fail('--tool is required — every number must cite what produced it');

  let raw: MetricsFile;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8')) as MetricsFile;
  } catch (e) {
    fail(`cannot read record file: ${(e as Error).message}`);
  }

  // validate metrics
  const metrics: Record<string, number | boolean> = {};
  const errors: string[] = [];
  for (const [id, value] of Object.entries(extractMetrics(raw))) {
    if (!METRIC_ID_RE.test(id)) {
      errors.push(`metric id "${id}" violates dot notation (see METRICS.md)`);
      continue;
    }
    if (typeof value === 'boolean') {
      metrics[id] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      metrics[id] = value;
    } else {
      errors.push(`metric "${id}" must be a finite number or boolean, got ${JSON.stringify(value)}`);
    }
  }
  if (Object.keys(metrics).length === 0) errors.push('record has no valid metrics');

  if (errors.length > 0) {
    for (const e of errors) console.error(`invalid: ${e}`);
    console.error('\nnothing was appended — history stays clean');
    process.exit(1);
  }

  // capturedAt: flag (backfill) > file > now
  let capturedAt = new Date().toISOString();
  const flagCaptured = typeof flags['capturedAt'] === 'string' ? flags['capturedAt'] : undefined;
  const fileCaptured = typeof raw['capturedAt'] === 'string' ? raw['capturedAt'] : undefined;
  if (flagCaptured !== undefined) {
    if (!ISO_RE.test(flagCaptured)) fail(`--capturedAt must be ISO 8601, got "${flagCaptured}"`);
    capturedAt = flagCaptured;
  } else if (fileCaptured !== undefined && ISO_RE.test(fileCaptured)) {
    capturedAt = fileCaptured;
    console.error(`note: using capturedAt from the record file (${capturedAt}) — pass --capturedAt explicitly for backfills`);
  }

  const record: RunRecord = {
    schemaVersion: SCHEMA_VERSION,
    target,
    tool,
    capturedAt,
    metrics,
  };
  if (typeof flags['wisdom'] === 'string') record.wisdom = flags['wisdom'];
  if (typeof flags['fixtures'] === 'string') record.fixtures = flags['fixtures'];
  if (typeof flags['runId'] === 'string') record.runId = flags['runId'];
  if (typeof flags['note'] === 'string') record.notes = flags['note'];

  const plan = loadPlan(target);
  if (plan !== null && plan.status === 'draft') {
    console.error('warning: plan is still a DRAFT — confirm it before judging records against thresholds');
  }
  if (plan !== null) {
    const planned = new Set(plan.metrics.map((m) => m.id));
    const unplanned = Object.keys(record.metrics).filter((id) => !planned.has(id));
    if (unplanned.length > 0) {
      console.error(`note: metric(s) not in the plan for ${target}: ${unplanned.join(', ')}`);
    }
  }

  const { file: outFile, recordNumber } = appendRunRecord(record);
  console.log(`appended record #${recordNumber} → ${outFile}`);
  console.log(`  tool: ${record.tool}  capturedAt: ${record.capturedAt}`);
  for (const [id, value] of Object.entries(record.metrics)) {
    console.log(`  ${id} = ${value}`);
  }
  void countRecords;
}

main();
