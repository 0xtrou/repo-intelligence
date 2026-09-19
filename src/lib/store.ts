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

const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function assertValidTarget(target: string): void {
  if (target.startsWith('/') || target.endsWith('/')) {
    throw new Error(`invalid target id "${target}" — no leading/trailing slashes`);
  }
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.' || segment === '..' || !SEGMENT_RE.test(segment)) {
      throw new Error(`invalid target id "${target}" — slash-separated segments must match ${SEGMENT_RE.source} (no "..")`);
    }
  }
}

export function runsFileFor(target: string): string {
  assertValidTarget(target);
  return path.join(runsDir(), ...target.split('/')) + '.jsonl';
}

export function appendRunRecord(record: RunRecord): { file: string; recordNumber: number } {
  const file = runsFileFor(record.target);
  fs.mkdirSync(path.dirname(file), { recursive: true });
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
  const base = runsDir();
  if (!fs.existsSync(base)) return [];
  const out: string[] = [];
  const visit = (dir: string, prefix: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        visit(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        out.push(`${prefix}${entry.name.replace(/\.jsonl$/, '')}`);
      }
    }
  };
  visit(base, '');
  return out.sort();
}

export function planFileFor(target: string): string {
  assertValidTarget(target);
  const segments = [...target.split('/')];
  const last = segments.pop() as string;
  return path.join(plansDir(), ...segments, `${last}.plan.json`);
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
