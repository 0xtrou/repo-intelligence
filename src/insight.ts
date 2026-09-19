/**
 * Layer 4 — INTELLIGENCE. Aggregates the append-only history for a target:
 * per-metric stats vs baseline, threshold checks (from the MeasurementPlan when present),
 * per-wisdom comparison, and coverage gaps. Derived values are computed, never stored.
 *
 * `--rollup` prints the child × metric matrix for a parent target (the fractal ladder's
 * bigger matrix) — recursion depth is the agent's call, the report only suggests.
 *
 * Usage: npm run insight -- <target> [--rollup] [--wisdom <w>] [--json]
 */
import { fail, parseArgs } from './lib/cli';
import { listTargets, loadPlan, loadRunRecords } from './lib/store';
import { MetricStat, RunRecord } from './lib/types';

function toTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function computeStats(id: string, records: RunRecord[]): MetricStat {
  const values = records.map((r) => r.metrics[id]).filter((v): v is number | boolean => v !== undefined);
  const booleans = values.filter((v): v is boolean => typeof v === 'boolean');

  if (booleans.length === values.length && booleans.length > 0) {
    return { id, kind: 'boolean', count: values.length, passRate: booleans.filter((b) => b).length / booleans.length };
  }

  const numbers = values.filter((v): v is number => typeof v === 'number');
  if (numbers.length === 0) {
    return { id, kind: 'boolean', count: 0 };
  }
  const first = numbers[0] as number;
  const latest = numbers[numbers.length - 1] as number;
  return {
    id,
    kind: 'number',
    count: numbers.length,
    first,
    latest,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    deltaVsBaseline: latest - first,
  };
}

function thresholdPass(stat: MetricStat): boolean | undefined {
  if (stat.threshold === undefined || stat.latest === undefined) return undefined;
  return stat.threshold.kind === 'max' ? stat.latest <= stat.threshold.value : stat.latest >= stat.threshold.value;
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const pad = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
const num = (v: number | undefined): string => (v === undefined ? '—' : String(Math.round(v * 1000) / 1000));

function runRollup(parent: string): void {
  const children = listTargets().filter((t) => t.startsWith(`${parent}/`));
  if (children.length === 0) {
    console.log(`no child targets with history under "${parent}/" — profile a child deliberately first (depth is the agent's call, PHILOSOPHY.md).`);
    return;
  }

  const perChild = children.map((child) => ({ target: child, records: loadRunRecords(child) }));
  const metricIds = [...new Set(perChild.flatMap((c) => c.records.flatMap((r) => Object.keys(r.metrics))))].sort();

  console.log(`Roll-up matrix — ${parent} (${children.length} child target(s), ${metricIds.length} metric(s))`);
  const idWidth = Math.max(14, ...metricIds.map((id) => id.length + 2));
  console.log(`  ${pad('child target', 32)}${metricIds.map((id) => pad(id, idWidth)).join('')}records`);
  for (const { target: child, records } of perChild) {
    const latest: Record<string, number | boolean> = {};
    for (const r of records) Object.assign(latest, r.metrics);
    const cells = metricIds.map((id) => {
      const v = latest[id];
      return v === undefined ? pad('—', idWidth) : pad(typeof v === 'boolean' ? String(v) : num(v), idWidth);
    });
    console.log(`  ${pad(child, 32)}${cells.join('')}${pad(String(records.length), 7)}`);
  }
  console.log("\n  depth is the agent's call: recurse into the child whose cells demand it — never the whole tree at once.");
}

function printGaps(planMetrics: { id: string }[] | null, measuredIds: string[], records: RunRecord[]): void {
  const measured = new Set(measuredIds);
  if (planMetrics !== null) {
    const neverMeasured = planMetrics.map((m) => m.id).filter((id) => !measured.has(id));
    console.log(neverMeasured.length === 0
      ? '  coverage gaps: none — every planned metric has at least one record.'
      : `  coverage gaps (planned, never measured): ${neverMeasured.join(', ')}`);
  }
  const wisdoms = [...new Set(records.map((r) => r.wisdom).filter((w): w is string => w !== undefined))];
  for (const w of wisdoms) {
    const has = new Set(records.filter((r) => r.wisdom === w).flatMap((r) => Object.keys(r.metrics)));
    const missing = measuredIds.filter((id) => !has.has(id));
    if (missing.length > 0) {
      console.log(`  wisdom "${w}" never measured on: ${missing.join(', ')}`);
    }
  }
}

function main(): void {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const target = positionals[0];
  if (target === undefined) fail('missing target', 'usage: npm run insight -- <target> [--rollup] [--wisdom <w>] [--json]');

  if (flags['rollup'] === true) {
    runRollup(target);
    return;
  }

  if (!listTargets().includes(target)) {
    fail(`no history for target "${target}" — known targets: ${listTargets().join(', ') || '(none)'}`);
  }

  let records = loadRunRecords(target);
  const wisdomFilter = typeof flags['wisdom'] === 'string' ? flags['wisdom'] : undefined;
  if (wisdomFilter !== undefined) records = records.filter((r) => r.wisdom === wisdomFilter);
  records.sort((a, b) => toTime(a.capturedAt) - toTime(b.capturedAt));

  if (records.length === 0) {
    console.log(`no records${wisdomFilter ? ` for wisdom "${wisdomFilter}"` : ''} for "${target}" — run npm run measure first`);
    return;
  }

  const plan = loadPlan(target);
  const thresholds = new Map(plan !== null ? plan.metrics.filter((m) => m.threshold).map((m) => [m.id, m.threshold as { kind: 'max' | 'min'; value: number }]) : []);
  const plannedIds = new Set(plan !== null ? plan.metrics.map((m) => m.id) : []);

  const metricIds = [...new Set(records.flatMap((r) => Object.keys(r.metrics)))].sort();
  const stats = metricIds.map((id) => {
    const stat = computeStats(id, records);
    const thr = thresholds.get(id);
    if (thr !== undefined) {
      stat.threshold = thr;
      stat.latestPassesThreshold = thresholdPass(stat);
    }
    return stat;
  });

  const spanStart = records[0]?.capturedAt ?? '—';
  const spanEnd = records[records.length - 1]?.capturedAt ?? '—';
  const tools = [...new Set(records.map((r) => r.tool))];
  const wisdoms = [...new Set(records.map((r) => r.wisdom).filter((w): w is string => w !== undefined))];
  const fixtures = [...new Set(records.map((r) => r.fixtures).filter((f): f is string => f !== undefined))];

  if (flags['json'] === true) {
    console.log(
      JSON.stringify(
        {
          target,
          records: records.length,
          span: { from: spanStart, to: spanEnd },
          tools,
          wisdoms,
          fixtures,
          planStatus: plan?.status ?? 'none',
          planPhase: plan?.phase ?? null,
          stats,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Insight — ${target}${plan?.phase ? `  [phase: ${plan.phase}]` : ''}`);
  console.log(`  records: ${records.length}  span: ${spanStart} → ${spanEnd}`);
  console.log(`  tools: ${tools.join(', ')}  wisdoms: ${wisdoms.join(', ') || '—'}  fixtures: ${fixtures.join(', ') || '—'}`);
  console.log(`  plan: ${plan === null ? 'none' : `${plan.status}${plan.phase ? `, phase ${plan.phase}` : ''}`}`);
  console.log('');

  console.log(`  ${pad('metric', 28)} ${pad('first', 10)} ${pad('latest', 10)} ${pad('Δ', 10)} ${pad('min/max', 20)} ${pad('thr', 14)} verdict`);
  for (const s of stats) {
    const minmax = s.kind === 'number' && s.min !== undefined && s.max !== undefined ? `${num(s.min)}/${num(s.max)}` : s.kind === 'boolean' && s.passRate !== undefined ? `pass ${(s.passRate * 100).toFixed(0)}%` : '—';
    const thr = s.threshold ? `${s.threshold.kind === 'max' ? '≤' : '≥'} ${s.threshold.value}` : '—';
    let verdict = '';
    if (s.latestPassesThreshold === true) verdict = 'PASS';
    else if (s.latestPassesThreshold === false) verdict = 'FAIL';
    const unplanned = plan !== null && !plannedIds.has(s.id) ? ' (not in plan)' : '';
    console.log(`  ${pad(s.id, 28)} ${pad(num(s.first), 10)} ${pad(num(s.latest), 10)} ${pad(num(s.deltaVsBaseline), 10)} ${pad(minmax, 20)} ${pad(thr, 14)} ${verdict}${unplanned}`);
  }

  // coverage gaps — the harness naming its own blind spots (Layer D, computed)
  console.log('');
  printGaps(plan?.metrics ?? null, metricIds, records);

  // per-wisdom comparison — only meaningful with normalized fixtures
  if (wisdoms.length >= 2) {
    console.log('\nWisdom comparison (numeric metrics, mean per wisdom):');
    console.log(`  ${pad('metric', 28)} ${wisdoms.map((w) => pad(w, 14)).join('')}`);
    const fixturesSets = new Set(records.map((r) => r.fixtures ?? ''));
    if (fixturesSets.size > 1) {
      console.log('  caution: multiple fixture sets present — comparison is NOT normalized (principle 9)');
    }
    for (const id of metricIds) {
      const cells = wisdoms.map((w) => {
        const vals = records.filter((r) => r.wisdom === w && typeof r.metrics[id] === 'number').map((r) => r.metrics[id] as number);
        const m = mean(vals);
        return m === undefined ? pad('—', 14) : pad(String(Math.round(m * 1000) / 1000), 14);
      });
      console.log(`  ${pad(id, 28)} ${cells.join('')}`);
    }
  } else if (wisdoms.length === 1) {
    console.log('\nOnly one wisdom labeled so far — label records from the other wisdoms to compare.');
  } else {
    console.log('\nNo wisdom labels yet — add --wisdom to comparable runs to enable comparisons.');
  }

  const childTargets = listTargets().filter((t) => t.startsWith(`${target}/`));
  if (childTargets.length > 0) {
    console.log(`\nChild targets with history: ${childTargets.join(', ')} — run insight --rollup for the bigger matrix.`);
  }
}

main();
