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
import { appendRunRecord, loadPlan } from './lib/store';
import { ISO_RE, validateMetrics } from './lib/recordLib';
import { RunRecord, SCHEMA_VERSION } from './lib/types';

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

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    fail(`cannot read record file: ${(e as Error).message}`);
  }

  const { metrics, errors } = validateMetrics(raw);
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
}

main();
