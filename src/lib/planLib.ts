/**
 * Layer 2 internals — the architect's reasoning: from a RepoProfile to tooling
 * prescriptions and metric definitions. Pure functions over the profile.
 */
import type { MetricDefinition, RepoProfile, ToolPrescription } from './types';

function hasWebRoutes(profile: RepoProfile): boolean {
  return profile.routes.count > 0 && profile.routes.framework !== null;
}

function hasFramework(profile: RepoProfile, name: string): boolean {
  return profile.stack.frameworks.includes(name) || profile.workflow.toolingPresent.includes(name);
}

export function buildTooling(profile: RepoProfile): ToolPrescription[] {
  const tooling: ToolPrescription[] = [];
  const web = hasWebRoutes(profile);

  // e2e / cross-device
  const maestro = hasFramework(profile, 'Maestro');
  const playwright = hasFramework(profile, 'Playwright');
  if (playwright) {
    tooling.push({
      concern: 'e2e',
      tool: 'Playwright',
      rationale: 'already in the target — cross-browser e2e with custom viewports',
      present: true,
    });
  }
  if (maestro) {
    tooling.push({
      concern: 'e2e',
      tool: 'Maestro',
      rationale: 'flows already present — user-journey e2e driven by stable visible-text anchors',
      present: true,
    });
    if (!playwright) {
      tooling.push({
        concern: 'cross-device',
        tool: 'Playwright',
        rationale: 'Maestro web is Chromium-only with preset viewports; the cross-device matrix (custom widths, webkit/iPad) needs a second runner',
        present: false,
      });
    }
  } else if (!playwright && web) {
    tooling.push({
      concern: 'e2e',
      tool: 'Playwright',
      rationale: `web app with ${profile.routes.count} routed page(s) but no e2e runner detected`,
      present: false,
    });
  }

  // unit
  if (hasFramework(profile, 'Vitest') || hasFramework(profile, 'Jest') || hasFramework(profile, 'Mocha')) {
    const unit = ['Vitest', 'Jest', 'Mocha'].find((t) => hasFramework(profile, t)) ?? 'Vitest';
    tooling.push({ concern: 'unit', tool: unit, rationale: 'already in the target', present: true });
  } else if (profile.loc.total > 0) {
    tooling.push({
      concern: 'unit',
      tool: 'Vitest',
      rationale: 'code present but no unit-test runner detected',
      present: false,
    });
  }

  // accessibility
  if (hasFramework(profile, 'axe-core')) {
    tooling.push({ concern: 'accessibility', tool: 'axe-core', rationale: 'already in the target', present: true });
  } else if (web) {
    tooling.push({
      concern: 'accessibility',
      tool: '@axe-core/playwright',
      rationale: 'web app with no accessibility instrument detected',
      present: false,
    });
  }

  // performance — absence of a perf instrument is itself a finding
  if (hasFramework(profile, 'Lighthouse')) {
    tooling.push({ concern: 'performance', tool: 'Lighthouse', rationale: 'already in the target', present: true });
  } else if (web) {
    tooling.push({
      concern: 'performance',
      tool: 'Lighthouse CI (+ web-vitals for field CWV)',
      rationale: 'no performance instrument detected — most harnesses measure correctness well and leave "fast" an unmeasured claim',
      present: false,
    });
  }

  // visual regression
  if (web) {
    if (maestro) {
      tooling.push({
        concern: 'visual-regression',
        tool: 'Maestro assertScreenshot',
        rationale: 'reference screenshots as version-controlled evidence (re-baseline deliberately only)',
        present: true,
      });
    } else if (playwright) {
      tooling.push({
        concern: 'visual-regression',
        tool: 'Playwright screenshots',
        rationale: 'screenshot capture available; add a reference-diff step for true visual regression',
        present: true,
      });
    }
  }

  // workflow telemetry — always prescribed, never yet present
  tooling.push({
    concern: 'workflow-telemetry',
    tool: 'repo-intelligence (measure/insight)',
    rationale: 'gate pass-rates, gate runtimes and rework loops are workflow metrics; record them via this toolkit',
    present: false,
  });

  return tooling;
}

export function buildMetrics(profile: RepoProfile): MetricDefinition[] {
  const metrics: MetricDefinition[] = [];
  const web = hasWebRoutes(profile);

  metrics.push(
    {
      id: 'workflow.gate.passRate',
      layer: 'B',
      unit: 'ratio',
      description: 'fraction of gate runs green',
      source: 'record each gate run via measure (tool = the gate command)',
      threshold: { kind: 'min', value: 0.95 },
    },
    {
      id: 'workflow.gate.durationMs',
      layer: 'B',
      unit: 'ms',
      description: 'gate battery runtime (cost of verification)',
      source: 'time the gate command, record via measure',
    },
    {
      id: 'workflow.rework.loops',
      layer: 'B',
      unit: 'count',
      description: 'fix-verify loops per task',
      source: 'task log / agent session notes',
      threshold: { kind: 'max', value: 2 },
    }
  );

  if (web) {
    const perfMissing = !hasFramework(profile, 'Lighthouse');
    const axeMissing = !hasFramework(profile, 'axe-core');
    metrics.push(
      {
        id: 'runtime.lcpMs',
        layer: 'C',
        unit: 'ms',
        description: 'Largest Contentful Paint',
        source: 'Lighthouse (lab) / web-vitals (field)',
        threshold: { kind: 'max', value: 2500 },
        instrumentMissing: perfMissing,
      },
      {
        id: 'runtime.cls',
        layer: 'C',
        unit: 'score',
        description: 'Cumulative Layout Shift',
        source: 'Lighthouse (lab) / web-vitals (field)',
        threshold: { kind: 'max', value: 0.1 },
        instrumentMissing: perfMissing,
      },
      {
        id: 'runtime.ttfbMs',
        layer: 'C',
        unit: 'ms',
        description: 'Time to First Byte',
        source: 'Lighthouse / server timing',
        threshold: { kind: 'max', value: 800 },
        instrumentMissing: perfMissing,
      },
      {
        id: 'runtime.transferBytes',
        layer: 'C',
        unit: 'bytes',
        description: 'page weight (transfer size)',
        source: 'Lighthouse / HAR',
        instrumentMissing: perfMissing,
      },
      {
        id: 'a11y.violations',
        layer: 'C',
        unit: 'count',
        description: 'axe violations (scoped ruleset)',
        source: 'axe run',
        threshold: { kind: 'max', value: 0 },
        instrumentMissing: axeMissing,
      }
    );
  }

  return metrics;
}
