import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MeasurementPlan, RunRecord } from './types';

/**
 * Storage for runs/ (append-only measurement history) and plans/ (MeasurementPlans).
 * Append-only is enforced by construction: records are written with appendFileSync
 * (O_APPEND), which never truncates. There is deliberately no rewrite or delete API.
 *
 * RI_DATA_DIR overrides the data root — used by tests to sandbox the store away
 * from real history.
 */

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');

function rootDir(): string {
  return path.resolve(process.env.RI_DATA_DIR ?? DEFAULT_ROOT);
}

export function runsDir(): string {
  return path.join(rootDir(), 'runs');
}

export function plansDir(): string {
  return path.join(rootDir(), 'plans');
}

const TARGET_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function assertValidTarget(target: string): void {
  if (!TARGET_RE.test(target)) {
    throw new Error(`invalid target id "${target}" — must match ${TARGET_RE.source}`);
  }
}

export function runsFileFor(target: string): string {
  assertValidTarget(target);
  return path.join(runsDir(), `${target}.jsonl`);
}

export function appendRunRecord(record: RunRecord): { file: string; recordNumber: number } {
  const file = runsFileFor(record.target);
  fs.mkdirSync(runsDir(), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  const recordNumber = countRecords(record.target);
  return { file, recordNumber };
}

export function countRecords(target: string): number {
  const file = runsFileFor(target);
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim().length > 0).length;
}

export function loadRunRecords(target: string): RunRecord[] {
  const file = runsFileFor(target);
  if (!fs.existsSync(file)) return [];
  const records: RunRecord[] = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const [i, line] of lines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      records.push(JSON.parse(trimmed) as RunRecord);
    } catch {
      throw new Error(`${file}:${i + 1} is not valid JSON — history is corrupted, repair it before appending`);
    }
  }
  return records;
}

export function listTargets(): string[] {
  if (!fs.existsSync(runsDir())) return [];
  return fs
    .readdirSync(runsDir())
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.replace(/\.jsonl$/, ''))
    .sort();
}

export function planFileFor(target: string): string {
  assertValidTarget(target);
  return path.join(plansDir(), `${target}.plan.json`);
}

export function savePlan(plan: MeasurementPlan, outFile?: string): string {
  const file = outFile ?? planFileFor(plan.target);
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return file;
}

export function loadPlan(target: string): MeasurementPlan | null {
  const file = planFileFor(target);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as MeasurementPlan;
}
