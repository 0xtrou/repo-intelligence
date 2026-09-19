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

/** True when the target declares a world-facing surface (web routes, contracts, bins, public package, public remote). */
function hasOutwardSurface(profile: RepoProfile): boolean {
  const outward = profile.outward;
  return (
    hasWebRoutes(profile) ||
    (outward !== undefined &&
      (outward.contractFiles.length > 0 ||
        outward.declares.bin.length > 0 ||
        outward.declares.private === false ||
        outward.gitRemote?.includes('github.com') === true))
  );
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

  // external monitoring — Inside–Outside model: BOUNDARY + OUTSIDE numbers come from
  // existing world-facing tools, ingested via measure. Never new target-specific code.
  if (hasOutwardSurface(profile)) {
    tooling.push({
      concern: 'external-monitoring',
      tool: 'generic: gh api / npm registry / target monitors / manual probes',
      rationale: 'the target has a declared world-facing surface; external.* and perception.* metrics are collected from sources that exist and recorded via measure',
      present: false,
    });
  }

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

  // Layer E — outward (see METRICS.md and the Inside–Outside model in PHILOSOPHY.md).
  const outward = profile.outward;
  if (web) {
    metrics.push(
      {
        id: 'external.api.errorRate',
        layer: 'E',
        unit: 'ratio',
        description: 'error rate of the API the repo exposes',
        source: 'target monitors / probe scripts / manual',
        threshold: { kind: 'max', value: 0.01 },
        instrumentMissing: true,
      },
      {
        id: 'external.api.latencyMs',
        layer: 'E',
        unit: 'ms',
        description: 'latency of the exposed API surface',
        source: 'target monitors / probes',
        threshold: { kind: 'max', value: 800 },
        instrumentMissing: true,
      }
    );
  }
  if (outward !== undefined && outward.contractFiles.length > 0) {
    metrics.push({
      id: 'external.contract.drift',
      layer: 'E',
      unit: 'count',
      description: 'consumer-visible contract mismatches detected',
      source: 'contract tests of the target',
      threshold: { kind: 'max', value: 0 },
      instrumentMissing: true,
    });
  }
  if (outward?.gitRemote?.includes('github.com')) {
    metrics.push(
      {
        id: 'perception.github.stars',
        layer: 'E',
        unit: 'count',
        description: 'GitHub stars',
        source: 'gh api repos/<owner>/<repo>',
        instrumentMissing: true,
      },
      {
        id: 'perception.github.openIssues',
        layer: 'E',
        unit: 'count',
        description: 'open issues',
        source: 'gh api repos/<owner>/<repo>',
        instrumentMissing: true,
      }
    );
  }
  if (outward !== undefined && outward.declares.private === false) {
    metrics.push({
      id: 'perception.npm.downloadsWeekly',
      layer: 'E',
      unit: 'count',
      description: 'weekly downloads of the published package',
      source: 'npm registry',
      instrumentMissing: true,
    });
  }
  if (profile.deps.prod.length > 0) {
    metrics.push({
      id: 'perception.dep.deprecatedCount',
      layer: 'E',
      unit: 'count',
      description: 'declared deps deprecated upstream',
      source: 'npm registry check of deps',
      threshold: { kind: 'max', value: 0 },
      instrumentMissing: true,
    });
  }

  // Layer S — the fractal ladder's standing anchors (see PHILOSOPHY.md). Always prescribed:
  // every repo serves a business and a philosophy; deeper Layer S adoption is the agent's
  // and user's call at the Phase-2 gate (METRICS.md — Layer S).
  metrics.push(
    {
      id: 'business.revenue.monthlyUsd',
      layer: 'S',
      unit: 'usd/month',
      description: 'revenue of the business the repo serves',
      source: 'business analytics / user interview',
      instrumentMissing: true,
    },
    {
      id: 'philosophy.inclusion.score',
      layer: 'S',
      unit: 'ratio',
      description: 'how fully the product serves all humans; a11y.violations is the code proxy',
      source: 'manual audit / a11y records',
      threshold: { kind: 'min', value: 0.95 },
      instrumentMissing: true,
    }
  );

  return metrics;
}
