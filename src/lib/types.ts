/** Canonical types for repo-intelligence. Metric ids and units are defined in METRICS.md — this file mirrors them. */

export const SCHEMA_VERSION = 1;

// ---------- Layer 1: RepoProfile ----------

export interface RepoProfile {
  schemaVersion: number;
  target: string;
  path: string;
  profiledAt: string;
  stack: {
    languages: Record<string, number>;
    packageManagers: string[];
    frameworks: string[];
  };
  loc: { total: number; byExtension: Record<string, number> };
  routes: { count: number; framework: string | null; samples: string[] };
  tests: { unitFiles: number; e2eFiles: number };
  deps: { prod: string[]; dev: string[] };
  workflow: {
    agentsMd: boolean;
    claudeMd: boolean;
    ciWorkflows: string[];
    gateScripts: string[];
    toolingPresent: string[];
  };
  /**
   * Inside–Outside model: BOUNDARY declarations, as stated by the target's own
   * manifests. The profile never parses frameworks to discover endpoints —
   * declaring the surface is the target's job (see PHILOSOPHY.md).
   */
  outward?: {
    declares: { bin: string[]; private: boolean | null; workspaces: string[]; publishConfig: boolean };
    contractFiles: string[];
    gitRemote: string | null;
  };
  notes: string[];
}

// ---------- Layer 2: MeasurementPlan ----------

export type ToolConcern =
  | 'unit'
  | 'e2e'
  | 'visual-regression'
  | 'cross-device'
  | 'accessibility'
  | 'performance'
  | 'workflow-telemetry'
  | 'external-monitoring';

export interface ToolPrescription {
  concern: ToolConcern;
  tool: string;
  rationale: string;
  /** true = already in the target; false = prescription for the target to adopt (its own work, never ours). */
  present: boolean;
}

export interface MetricDefinition {
  /** Must exist in METRICS.md (canonical vocabulary). */
  id: string;
  /** B=workflow, C=runtime/site, E=outward (external.* + perception.*). */
  layer: 'B' | 'C' | 'E';
  unit: string;
  description: string;
  source: string;
  threshold?: { kind: 'max' | 'min'; value: number };
  /** true = no source tool exists in the target yet. */
  instrumentMissing?: boolean;
}

export interface MeasurementPlan {
  schemaVersion: number;
  target: string;
  createdAt: string;
  status: 'draft' | 'confirmed';
  basedOnProfile?: string;
  tooling: ToolPrescription[];
  metrics: MetricDefinition[];
}

// ---------- Layer 3: RunRecord ----------

export interface RunRecord {
  schemaVersion: number;
  target: string;
  tool: string;
  capturedAt: string;
  wisdom?: string;
  fixtures?: string;
  runId?: string;
  metrics: Record<string, number | boolean>;
  notes?: string;
}

// ---------- Layer 4: insight stats ----------

export interface MetricStat {
  id: string;
  kind: 'number' | 'boolean';
  count: number;
  /** numeric metrics */
  first?: number;
  latest?: number;
  min?: number;
  max?: number;
  deltaVsBaseline?: number;
  /** boolean metrics: fraction of true */
  passRate?: number;
  /** from the MeasurementPlan, when present */
  threshold?: { kind: 'max' | 'min'; value: number };
  latestPassesThreshold?: boolean;
}
