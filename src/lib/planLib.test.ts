import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMetrics, buildTooling } from './planLib';
import { RepoProfile } from './types';

function profile(overrides: Partial<RepoProfile> = {}): RepoProfile {
  return {
    schemaVersion: 1,
    target: 't',
    path: '/t',
    profiledAt: new Date().toISOString(),
    stack: { languages: { TypeScript: 10 }, packageManagers: ['npm'], frameworks: [] },
    loc: { total: 10, byExtension: { '.ts': 10 } },
    routes: { count: 0, framework: null, samples: [] },
    tests: { unitFiles: 0, e2eFiles: 0 },
    deps: { prod: [], dev: [] },
    workflow: { agentsMd: false, claudeMd: false, ciWorkflows: [], gateScripts: [], toolingPresent: [] },
    notes: [],
    ...overrides,
  };
}

const webApp = (): RepoProfile =>
  profile({ routes: { count: 5, framework: 'Astro (src/pages)', samples: [] } });

test('workflow-telemetry is always prescribed (never present yet)', () => {
  for (const p of [profile(), webApp(), profile({ stack: { languages: {}, packageManagers: [], frameworks: ['Playwright', 'Maestro', 'Lighthouse'] } })]) {
    const telemetry = buildTooling(p).filter((t) => t.concern === 'workflow-telemetry');
    assert.equal(telemetry.length, 1);
    assert.equal(telemetry[0]?.present, false);
  }
});

test('web app with no tooling gets e2e + a11y + performance prescribed as missing', () => {
  const tooling = buildTooling(webApp());
  const byConcern = (c: string): (typeof tooling)[number] | undefined => tooling.find((t) => t.concern === c);

  const e2e = byConcern('e2e');
  assert.equal(e2e?.tool, 'Playwright');
  assert.equal(e2e?.present, false);

  assert.equal(byConcern('accessibility')?.present, false);
  assert.equal(byConcern('performance')?.present, false);
});

test('Maestro without Playwright triggers a cross-device prescription (Maestro web is Chromium-only)', () => {
  const p = webApp();
  p.workflow.toolingPresent = ['Maestro'];
  const tooling = buildTooling(p);
  const crossDevice = tooling.find((t) => t.concern === 'cross-device');
  assert.ok(crossDevice);
  assert.equal(crossDevice?.tool, 'Playwright');
  assert.equal(crossDevice?.present, false);
  // Maestro e2e itself is present
  const e2e = tooling.filter((t) => t.concern === 'e2e');
  assert.ok(e2e.some((t) => t.tool === 'Maestro' && t.present === true));
});

test('Playwright present means no cross-device prescription needed', () => {
  const p = webApp();
  p.workflow.toolingPresent = ['Maestro', 'Playwright'];
  const tooling = buildTooling(p);
  assert.equal(tooling.find((t) => t.concern === 'cross-device'), undefined);
  assert.ok(tooling.some((t) => t.tool === 'Playwright' && t.present === true));
});

test('web metrics include layer C with instrumentMissing flags when tools are absent', () => {
  const metrics = buildMetrics(webApp());
  const lcp = metrics.find((m) => m.id === 'runtime.lcpMs');
  assert.ok(lcp);
  assert.equal(lcp?.layer, 'C');
  assert.equal(lcp?.threshold?.kind, 'max');
  assert.equal(lcp?.threshold?.value, 2500);
  assert.equal(lcp?.instrumentMissing, true); // no Lighthouse in the fixture

  const a11y = metrics.find((m) => m.id === 'a11y.violations');
  assert.equal(a11y?.instrumentMissing, true); // no axe-core in the fixture
});

test('Inside–Outside: outward surface adds external-monitoring prescription and layer E metrics', () => {
  const p = webApp();
  p.outward = {
    declares: { bin: [], private: true, workspaces: [], publishConfig: false },
    contractFiles: ['openapi.json'],
    gitRemote: 'https://github.com/0xtrou/some-repo.git',
  };
  p.deps.prod = ['astro'];

  // tooling: external-monitoring prescribed via existing generic tools
  const tooling = buildTooling(p);
  const monitoring = tooling.find((t) => t.concern === 'external-monitoring');
  assert.ok(monitoring);
  assert.equal(monitoring?.present, false);

  // metrics: external.* (web + contract) + perception.* (github remote)
  const metrics = buildMetrics(p);
  const eMetrics = metrics.filter((m) => m.layer === 'E');
  const eIds = eMetrics.map((m) => m.id);
  for (const id of ['external.api.errorRate', 'external.api.latencyMs', 'external.contract.drift', 'perception.github.stars', 'perception.github.openIssues', 'perception.dep.deprecatedCount']) {
    assert.ok(eIds.includes(id), `expected ${id} in plan`);
  }
  assert.ok(eMetrics.every((m) => m.instrumentMissing === true), 'layer E starts instrument-missing');
  assert.ok(!eIds.includes('perception.npm.downloadsWeekly'), 'private package must not prescribe npm downloads');
});

test('Inside–Outside: fully internal target gets no outward prescriptions', () => {
  const metrics = buildMetrics(profile());
  assert.ok(metrics.every((m) => m.layer === 'B'));
  assert.ok(!metrics.some((m) => m.id.startsWith('external.') || m.id.startsWith('perception.')));
  assert.equal(buildTooling(profile()).find((t) => t.concern === 'external-monitoring'), undefined);
});

test('Inside–Outside: a GitHub remote alone prescribes perception metrics and monitoring', () => {
  const p = profile();
  p.outward = {
    declares: { bin: [], private: true, workspaces: [], publishConfig: false },
    contractFiles: [],
    gitRemote: 'git@github.com:0xtrou/private-lib.git',
  };
  const metrics = buildMetrics(p);
  assert.ok(metrics.some((m) => m.id === 'perception.github.stars' && m.layer === 'E'));
  const monitoring = buildTooling(p).find((t) => t.concern === 'external-monitoring');
  assert.ok(monitoring, 'a public remote is a world-facing surface');
});

test('non-web targets get only layer B metrics (no runtime/site metrics)', () => {
  const metrics = buildMetrics(profile());
  assert.ok(metrics.every((m) => m.layer === 'B'));
  assert.ok(metrics.some((m) => m.id === 'workflow.gate.passRate'));
});

test('instrumentMissing clears once the target has the tool', () => {
  const p = webApp();
  p.workflow.toolingPresent = ['Lighthouse', 'axe-core'];
  const metrics = buildMetrics(p);
  assert.equal(metrics.find((m) => m.id === 'runtime.lcpMs')?.instrumentMissing, false);
  assert.equal(metrics.find((m) => m.id === 'a11y.violations')?.instrumentMissing, false);
});
