/**
 * Layer 3 internals — RunRecord validation. A record that fails here never
 * touches runs/ (history stays clean). Pure functions.
 */

// dot notation, lowercase domains, camelCase segments allowed (e.g. runtime.lcpMs, workflow.gate.passRate)
export const METRIC_ID_RE = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;
export const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const WRAPPER_FIELDS = new Set([
  'schemaVersion', 'target', 'tool', 'capturedAt', 'wisdom', 'fixtures', 'runId', 'metrics', 'notes',
]);

/** Accepts {"metrics": {...}} or a bare metric map. */
export function extractMetrics(raw: Record<string, unknown>): Record<string, unknown> {
  const metrics = raw['metrics'];
  if (metrics !== undefined && typeof metrics === 'object' && metrics !== null) {
    return metrics as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!WRAPPER_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

export function validateMetrics(raw: Record<string, unknown>): {
  metrics: Record<string, number | boolean>;
  errors: string[];
} {
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
  return { metrics, errors };
}
