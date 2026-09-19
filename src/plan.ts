/**
 * Layer 2 — DEFINE GOOD (the architect step). Drafts a MeasurementPlan from a RepoProfile:
 * which tools the target needs (with rationale) and which metrics A/B/C it must track
 * (with units + suggested thresholds). Output is always status:"draft" unless --confirm
 * is passed — and the user confirms the draft before records are judged against it.
 *
 * This step prescribes; it never implements anything in the target repo.
 *
 * Usage: npm run plan -- <profile.json> [--out <file>] [--confirm]
 */
import * as fs from 'node:fs';
import { fail, parseArgs } from './lib/cli';
import { savePlan } from './lib/store';
import { buildMetrics, buildTooling } from './lib/planLib';
import { MeasurementPlan, RepoProfile, SCHEMA_VERSION } from './lib/types';

function main(): void {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const profileFile = positionals[0];
  if (profileFile === undefined) {
    fail('missing profile file', 'usage: npm run plan -- <profile.json> [--out <file>] [--confirm]');
  }

  let profile: RepoProfile;
  try {
    profile = JSON.parse(fs.readFileSync(profileFile, 'utf8')) as RepoProfile;
  } catch (e) {
    fail(`cannot read profile: ${(e as Error).message}`);
  }
  if (profile.target === undefined || profile.schemaVersion === undefined) {
    fail(`not a RepoProfile: ${profileFile} — run npm run profile first`);
  }

  const plan: MeasurementPlan = {
    schemaVersion: SCHEMA_VERSION,
    target: profile.target,
    createdAt: new Date().toISOString(),
    status: flags['confirm'] === true ? 'confirmed' : 'draft',
    basedOnProfile: profileFile,
    tooling: buildTooling(profile),
    metrics: buildMetrics(profile),
  };

  const outFile = savePlan(plan, typeof flags['out'] === 'string' ? flags['out'] : undefined);

  console.log(`MeasurementPlan (${plan.status}) — ${plan.target} → ${outFile}`);
  console.log('\nTooling prescriptions:');
  for (const t of plan.tooling) {
    console.log(`  [${t.present ? 'present ' : 'PRESCRIBE'}] ${t.concern.padEnd(20)} ${t.tool}`);
    console.log(`             ${t.rationale}`);
  }
  console.log('\nMetrics to track:');
  for (const m of plan.metrics) {
    const thr = m.threshold ? ` threshold ${m.threshold.kind} ${m.threshold.value}` : '';
    const missing = m.instrumentMissing ? ' [instrument missing]' : '';
    console.log(`  ${m.id.padEnd(28)} ${m.unit.padEnd(8)}${thr}${missing}`);
  }
  if (plan.status === 'draft') {
    console.log('\nThis plan is a DRAFT — review it with the user, then re-run with --confirm to sign off.');
  }
}

main();
